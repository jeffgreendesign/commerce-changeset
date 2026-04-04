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
  const raw: unknown = await request.json();
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

  // Constant-time comparison to prevent timing attacks
  const codeBuffer = Buffer.from(code);
  const expectedBuffer = Buffer.from(expected);
  const valid =
    codeBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(codeBuffer, expectedBuffer);

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
