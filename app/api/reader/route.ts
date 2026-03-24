/**
 * Reader Agent API route — authenticated natural-language product queries.
 *
 * POST /api/reader
 * Body: { message: string }
 * Returns: { text: string, toolCalls: [...] }
 */

import { NextResponse } from "next/server";
import { z } from "zod/v4";

import { auth0 } from "@/lib/auth0";
import { setAIContext } from "@auth0/ai-vercel";
import { TokenVaultInterrupt } from "@auth0/ai/interrupts";
import { runReaderAgent } from "@/lib/agents/reader";
import { evaluatePolicy } from "@/lib/policy/engine";
import { RiskTier } from "@/lib/policy/types";

const RequestBody = z.object({
  message: z.string().min(1).max(2000),
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

  // Policy gate — reader operations are always Tier 0 auto-approve.
  const decision = await evaluatePolicy({ operationType: "read" });
  if (decision.tier > RiskTier.READ) {
    return NextResponse.json(
      { error: "policy_denied", decision },
      { status: 403 }
    );
  }

  const refreshToken = session.tokenSet.refreshToken;
  if (!refreshToken) {
    return NextResponse.json(
      {
        error: "missing_refresh_token",
        message: "Session has no refresh token. Re-login with offline_access scope.",
      },
      { status: 403 }
    );
  }

  setAIContext({ threadID: `reader-${crypto.randomUUID()}` });

  try {
    const result = await runReaderAgent(parsed.data.message, refreshToken);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof TokenVaultInterrupt) {
      console.error("[reader] Token Vault interrupt — Google account not connected");
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
    console.error("[reader] Unhandled error:", err);
    throw err;
  }
}
