/**
 * Server-only judge mode detection — uses next/headers to check cookies.
 *
 * Import this in route handlers and server components only.
 * For client components, import JUDGE_COOKIE_NAME from ./config instead.
 */

import { cookies } from "next/headers";
import { JUDGE_COOKIE_NAME } from "./config";

/** Check if the current request has a judge session cookie (server-side). */
export async function isJudgeSession(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.has(JUDGE_COOKIE_NAME);
}
