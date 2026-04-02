/**
 * Demo mode configuration — cookie-based detection for the /demo route tree.
 *
 * The cookie name is shared between client and server. The isDemoSession()
 * helper is server-only (uses next/headers). Client components should
 * import only DEMO_COOKIE_NAME.
 */

export const DEMO_COOKIE_NAME = "demo_session";
