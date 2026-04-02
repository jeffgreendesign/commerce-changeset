/**
 * Server-only demo mode detection — uses next/headers to check cookies.
 *
 * Import this in route handlers and server components only.
 * For client components, import DEMO_COOKIE_NAME from ./config instead.
 */

import { cookies } from "next/headers";
import { DEMO_COOKIE_NAME } from "./config";

/** Check if the current request has a demo session cookie (server-side). */
export async function isDemoSession(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.has(DEMO_COOKIE_NAME);
}
