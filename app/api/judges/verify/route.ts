import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { JUDGE_COOKIE_NAME } from "@/lib/judges/config";

const VerifyBody = z.object({ code: z.string().optional() });

/**
 * POST /api/judges/verify — validates a shared access code server-side.
 *
 * Compares the submitted code against JUDGE_ACCESS_CODE env var using
 * constant-time comparison, then sets an HttpOnly session cookie on success.
 */
export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request", message: "Malformed JSON in request body" },
      { status: 400 },
    );
  }

  const parsed = VerifyBody.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const expected = process.env.JUDGE_ACCESS_CODE;

  if (!expected) {
    return NextResponse.json(
      { error: "Judge access is not configured" },
      { status: 503 },
    );
  }

  const code = parsed.data.code ?? "";

  // HMAC-based constant-time comparison — digests are always 32 bytes,
  // eliminating length leakage from short-circuit on mismatched lengths.
  const key = crypto.randomBytes(32);
  const codeHmac = crypto.createHmac("sha256", key).update(code).digest();
  const expectedHmac = crypto
    .createHmac("sha256", key)
    .update(expected)
    .digest();
  const valid = crypto.timingSafeEqual(codeHmac, expectedHmac);

  if (!valid) {
    return NextResponse.json(
      { error: "Invalid access code" },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(JUDGE_COOKIE_NAME, "true", {
    httpOnly: true,
    secure: true,
    path: "/",
    maxAge: 14400,
    sameSite: "lax",
  });

  return response;
}
