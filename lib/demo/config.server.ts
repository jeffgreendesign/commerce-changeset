/**
 * Server-only demo mode detection — uses next/headers to check cookies.
 *
 * Import this in route handlers and server components only.
 * For client components, import DEMO_COOKIE_NAME from ./config instead.
 */

import { cookies } from "next/headers";
import { DEMO_COOKIE_NAME } from "./config";
import { isJudgeSession } from "@/lib/judges/config.server";

/**
 * Check if the current request has a demo or judge session cookie.
 *
 * Judge sessions reuse demo data paths — API routes return mock data for
 * both demo and judge users. The distinction is frontend-only: demo shows
 * educational annotations while judge mode shows clean production UI.
 */
export async function isDemoSession(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.has(DEMO_COOKIE_NAME) || (await isJudgeSession());
}
