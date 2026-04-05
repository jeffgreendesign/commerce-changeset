/**
 * Execute API route — runs a draft change set through CIBA approval
 * and Writer Agent execution.
 *
 * POST /api/orchestrator/execute
 * Body: { changeSet: ChangeSet }
 * Returns: { changeSet: ChangeSet } (with execution field populated)
 *
 * Note: CIBA block mode can wait up to 120s for Guardian approval.
 * This may exceed serverless function timeouts on Vercel (10s hobby,
 * 60s pro). Acceptable for hackathon / local development.
 */

import { NextResponse } from "next/server";
import { z } from "zod/v4";

import { auth0 } from "@/lib/auth0";
import { apiError, BAD_REQUEST, GOOGLE_CONNECTION_REQUIRED, MISSING_REFRESH_TOKEN, UNAUTHORIZED } from "@/lib/api-error";
import { setAIContext } from "@auth0/ai-vercel";
import { TokenVaultInterrupt } from "@auth0/ai/interrupts";
import { executeChangeSet } from "@/lib/changeset/executor";
import type { ChangeSet } from "@/lib/changeset/types";
import { isDemoSession } from "@/lib/demo/config.server";
import { DEMO_SCENARIOS } from "@/lib/demo/scenarios";

const RequestBody = z.object({
  changeSet: z.record(z.string(), z.unknown()),
});

export async function POST(request: Request) {
  // ── Demo mode: simulate execution with 1.5s delay ─────────────────
  if (await isDemoSession()) {
    const body: unknown = await request.json();
    const parsed = RequestBody.safeParse(body);
    if (!parsed.success) {
      return apiError(BAD_REQUEST, "Invalid request", 400);
    }
    const cs = parsed.data.changeSet as unknown as ChangeSet;

    // Simulate CIBA approval + execution delay
    await new Promise((resolve) => setTimeout(resolve, 2500));

    // Find matching scenario by changeset ID or prompt
    const scenario = DEMO_SCENARIOS.find(
      (s) =>
        s.changeSet.id === cs.id ||
        s.changeSet.originalPrompt === cs.originalPrompt
    );

    const executionResult = scenario?.executionResult ?? {
      executedAt: new Date().toISOString(),
      results: cs.operations.map((op) => ({
        operationId: typeof op === "object" && op !== null && "id" in op ? (op as { id: string }).id : "",
        status: "success" as const,
        duration: 400,
      })),
      receipt: {
        changeSetId: cs.id ?? "",
        executedBy: "demo@stride-athletics.com",
        executedAt: new Date().toISOString(),
        oboChain: { user: "auth0|demo-user-001", delegatedTo: ["writer", "reader"] },
        agentDelegations: [],
        verification: { checksRun: 0, checksPassed: 0, results: [] },
        rollbackInstructions: "No rollback data available for this demo execution.",
        auditHash: `sha256:${crypto.randomUUID().replace(/-/g, "")}`,
      },
    };

    return NextResponse.json(
      {
        changeSet: {
          ...cs,
          status: "completed",
          approval: {
            approvedBy: "auth0|demo-user-001",
            approvedAt: new Date().toISOString(),
            cibaTransactionId: `ciba_demo_${crypto.randomUUID().slice(0, 8)}`,
            scopesGranted: ["openid", "commerce:write"],
            authorizationDetails: [],
          },
          execution: executionResult,
        },
      },
      { headers: { "x-demo-session": "1" } },
    );
  }

  // ── Production mode ───────────────────────────────────────────────
  const session = await auth0.getSession();
  if (!session) {
    return apiError(UNAUTHORIZED, "Unauthorized", 401);
  }

  const body: unknown = await request.json();
  const parsed = RequestBody.safeParse(body);
  if (!parsed.success) {
    return apiError(BAD_REQUEST, "Invalid request", 400);
  }

  const changeSet = parsed.data.changeSet as unknown as ChangeSet;
  if (changeSet.status !== "draft") {
    return apiError(
      BAD_REQUEST,
      `Change set must be in "draft" status. Got "${changeSet.status}".`,
      400,
    );
  }

  const refreshToken = session.tokenSet.refreshToken;
  if (!refreshToken) {
    return apiError(
      MISSING_REFRESH_TOKEN,
      "Session has no refresh token. Re-login with offline_access scope.",
      403,
    );
  }

  setAIContext({
    threadID: `execute-${changeSet.id}`,
  });

  const routeStart = performance.now();
  console.log(`[execute] POST /api/orchestrator/execute — changeSet: ${changeSet.id.slice(0, 8)}, ${changeSet.operations.length} operations`);

  try {
    const userEmail =
      session.user.email ?? session.user.name ?? session.user.sub;
    const result = await executeChangeSet(
      changeSet,
      refreshToken,
      session.user.sub,
      userEmail
    );
    console.log(`[execute] Completed in ${Math.round(performance.now() - routeStart)}ms — status: ${result.changeSet.status}`);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof TokenVaultInterrupt) {
      console.error("[execute] Token Vault interrupt — Google account not connected");
      return apiError(
        GOOGLE_CONNECTION_REQUIRED,
        "Connect your Google account before using this feature. " +
          "Visit /api/spike/connect-google to link your account.",
        403,
      );
    }
    console.error("[execute] Unhandled error:", err);
    throw err;
  }
}
