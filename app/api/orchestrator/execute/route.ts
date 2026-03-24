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
import { setAIContext } from "@auth0/ai-vercel";
import { TokenVaultInterrupt } from "@auth0/ai/interrupts";
import { executeChangeSet } from "@/lib/changeset/executor";
import type { ChangeSet } from "@/lib/changeset/types";

const RequestBody = z.object({
  changeSet: z.record(z.string(), z.unknown()),
});

export async function POST(request: Request) {
  const session = await auth0.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await request.json();
  const parsed = RequestBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const changeSet = parsed.data.changeSet as unknown as ChangeSet;
  if (changeSet.status !== "draft") {
    return NextResponse.json(
      {
        error: "invalid_status",
        message: `Change set must be in "draft" status. Got "${changeSet.status}".`,
      },
      { status: 400 }
    );
  }

  const refreshToken = session.tokenSet.refreshToken;
  if (!refreshToken) {
    return NextResponse.json(
      {
        error: "missing_refresh_token",
        message:
          "Session has no refresh token. Re-login with offline_access scope.",
      },
      { status: 403 }
    );
  }

  setAIContext({
    threadID: `execute-${changeSet.id}`,
  });

  try {
    const userEmail =
      session.user.email ?? session.user.name ?? session.user.sub;
    const result = await executeChangeSet(
      changeSet,
      refreshToken,
      session.user.sub,
      userEmail
    );
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof TokenVaultInterrupt) {
      return NextResponse.json(
        {
          error: "google_connection_required",
          message:
            "Connect your Google account before using this feature. " +
            "Visit /api/spike/connect-google to link your account.",
        },
        { status: 403 }
      );
    }
    throw err;
  }
}
