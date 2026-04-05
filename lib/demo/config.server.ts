/**
 * Server-only demo mode detection — uses next/headers to check cookies.
 *
 * Import this in route handlers and server components only.
 * For client components, import DEMO_COOKIE_NAME from ./config instead.
 */

import { cookies, headers } from "next/headers";
import { DEMO_COOKIE_NAME, DEMO_HEADER_NAME } from "./config";
import { isJudgeSession } from "@/lib/judges/config.server";

/**
 * Check if the current request is a demo or judge session.
 *
 * Requires BOTH the demo cookie AND the x-demo-session request header.
 * The cookie alone is not sufficient — it persists across the domain and
 * would otherwise leak into production routes when a user visits /demo
 * and then navigates to the authenticated /dashboard.
 *
 * Judge sessions reuse demo data paths — API routes return mock data for
 * both demo and judge users. The distinction is frontend-only: demo shows
 * educational annotations while judge mode shows clean production UI.
 */
export async function isDemoSession(): Promise<boolean> {
  const headerStore = await headers();
  const hasHeader = headerStore.get(DEMO_HEADER_NAME) === "1";
  if (!hasHeader) return false;

  const cookieStore = await cookies();
  return cookieStore.has(DEMO_COOKIE_NAME) || (await isJudgeSession());
}
