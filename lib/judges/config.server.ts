/**
 * Server-only judge mode detection — uses next/headers to check cookies.
 *
 * Import this in route handlers and server components only.
 * For client components, import JUDGE_COOKIE_NAME from ./config instead.
 */

import crypto from "node:crypto";
import { cookies } from "next/headers";
import { JUDGE_COOKIE_NAME } from "./config";

/**
 * Check if the current request has a valid, signed judge session cookie.
 *
 * The cookie value is "expiry.hmac" where hmac = HMAC-SHA256(JUDGE_ACCESS_CODE, expiry).
 * Returns true only if the signature is valid and the token has not expired.
 */
export async function isJudgeSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(JUDGE_COOKIE_NAME)?.value;
  if (!token) return false;

  const secret = process.env.JUDGE_ACCESS_CODE;
  if (!secret) return false;

  const dotIndex = token.indexOf(".");
  if (dotIndex === -1) return false;

  const expiry = token.slice(0, dotIndex);
  const signature = token.slice(dotIndex + 1);

  // Verify expiry
  const expiryNum = Number(expiry);
  if (!Number.isFinite(expiryNum) || expiryNum < Math.floor(Date.now() / 1000)) {
    return false;
  }

  // Verify HMAC signature (constant-time)
  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(expiry)
    .digest("hex");

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSig);

  return (
    sigBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(sigBuffer, expectedBuffer)
  );
}
