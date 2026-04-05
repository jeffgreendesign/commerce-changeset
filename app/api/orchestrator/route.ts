/**
 * Orchestrator Agent API route — natural-language change set assembly.
 *
 * POST /api/orchestrator
 * Body: { message: string }
 * Returns: { changeSet: ChangeSet, reasoning: string }
 */

import { NextResponse } from "next/server";
import { z } from "zod/v4";

import { auth0 } from "@/lib/auth0";
import { apiError, BAD_REQUEST, GOOGLE_CONNECTION_REQUIRED, MISSING_REFRESH_TOKEN, UNAUTHORIZED } from "@/lib/api-error";
import { setAIContext } from "@auth0/ai-vercel";
import { TokenVaultInterrupt } from "@auth0/ai/interrupts";
import { runOrchestratorAgent } from "@/lib/agents/orchestrator";
import { isDemoSession } from "@/lib/demo/config.server";
import { matchScenario } from "@/lib/demo/classifier";
import { DEMO_SUGGESTIONS } from "@/lib/demo/scenarios";
import { buildMockReaderText } from "@/lib/demo/mock-data";

const RequestBody = z.object({
  message: z.string().min(1).max(2000),
});

export async function POST(request: Request) {
  // ── Demo mode: classifier → pre-built changeset ───────────────────
  if (await isDemoSession()) {
    const body: unknown = await request.json();
    const parsed = RequestBody.safeParse(body);
    if (!parsed.success) {
      return apiError(BAD_REQUEST, "Invalid request", 400);
    }

    // Simulate reader agent + orchestrator analysis delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const scenario = await matchScenario(parsed.data.message);
    if (!scenario) {
      return NextResponse.json({
        changeSet: null,
        reasoning: "I didn't recognize that request. Try one of these:",
        suggestions: DEMO_SUGGESTIONS,
      });
    }

    return NextResponse.json({
      changeSet: scenario.changeSet,
      reasoning: scenario.reasoning,
      readerText: scenario.readerText || buildMockReaderText(),
    });
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

  const refreshToken = session.tokenSet.refreshToken;
  if (!refreshToken) {
    return apiError(
      MISSING_REFRESH_TOKEN,
      "Session has no refresh token. Re-login with offline_access scope.",
      403,
    );
  }

  setAIContext({ threadID: `orchestrator-${crypto.randomUUID()}` });

  const routeStart = performance.now();
  console.log(`[orchestrator] POST /api/orchestrator — user: ${session.user.sub}, message: "${parsed.data.message.slice(0, 80)}${parsed.data.message.length > 80 ? "..." : ""}"`);

  try {
    const result = await runOrchestratorAgent(
      parsed.data.message,
      refreshToken,
      session.user.sub
    );
    console.log(`[orchestrator] Completed in ${Math.round(performance.now() - routeStart)}ms — ${result.changeSet.operations.length} operations`);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof TokenVaultInterrupt) {
      console.error("[orchestrator] Token Vault interrupt — Google account not connected");
      return apiError(
        GOOGLE_CONNECTION_REQUIRED,
        "Connect your Google account before using this feature. " +
          "Visit /api/auth/connect-google to link your account.",
        403,
      );
    }
    console.error("[orchestrator] Unhandled error:", err);
    throw err;
  }
}
