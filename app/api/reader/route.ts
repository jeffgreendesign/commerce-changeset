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
import { apiError, BAD_REQUEST, TOKEN_EXPIRED, UNAUTHORIZED } from "@/lib/api-error";
import { setAIContext } from "@auth0/ai-vercel";
import { TokenVaultInterrupt } from "@auth0/ai/interrupts";
import { runReaderAgent } from "@/lib/agents/reader";
import { evaluatePolicy } from "@/lib/policy/engine";
import { RiskTier } from "@/lib/policy/types";
import { isDemoSession } from "@/lib/demo/config.server";
import { buildMockReaderText } from "@/lib/demo/mock-data";

const RequestBody = z.object({
  message: z.string().min(1).max(2000),
});

export async function POST(request: Request) {
  // ── Demo mode: return mock product data ───────────────────────────
  if (await isDemoSession()) {
    return NextResponse.json({
      text: buildMockReaderText(),
      toolCalls: [{ toolName: "get_products", args: {} }],
      toolResults: [{ toolName: "get_products", result: { products: [] } }],
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

  // Policy gate — reader operations are always Tier 0 auto-approve.
  const decision = await evaluatePolicy({ operationType: "read" });
  if (decision.tier > RiskTier.READ) {
    return apiError("policy_denied", "Policy denied this operation", 403);
  }

  const refreshToken = session.tokenSet.refreshToken;
  if (!refreshToken) {
    return apiError(
      TOKEN_EXPIRED,
      "Session has no refresh token. Re-login with offline_access scope.",
      403,
    );
  }

  setAIContext({ threadID: `reader-${crypto.randomUUID()}` });

  try {
    const result = await runReaderAgent(parsed.data.message, refreshToken);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof TokenVaultInterrupt) {
      console.error("[reader] Token Vault interrupt — Google account not connected");
      return apiError(
        TOKEN_EXPIRED,
        "Connect your Google account before using this feature. " +
          "Visit /api/spike/connect-google to link your account.",
        403,
      );
    }
    console.error("[reader] Unhandled error:", err);
    throw err;
  }
}
