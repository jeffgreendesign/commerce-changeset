/**
 * Judge mode configuration — cookie-based detection for the /judges route tree.
 *
 * The cookie name is shared between client and server. The isJudgeSession()
 * helper is server-only (uses next/headers). Client components should
 * import only JUDGE_COOKIE_NAME.
 */

export const JUDGE_COOKIE_NAME = "judge_session";
