import { Auth0Client } from "@auth0/nextjs-auth0/server";

/**
 * Build appBaseUrl for Auth0 v4 SDK.
 *
 * - If APP_BASE_URL is set (e.g. in production), use it directly.
 * - On Vercel preview deployments, VERCEL_URL is the per-deployment hostname.
 *   Pass it so the SDK uses the correct domain for cookies and callbacks.
 * - When neither is set (local dev), returns undefined so the SDK infers
 *   the origin from the incoming request's Host header.
 */
export function resolveAppBaseUrl(): string | undefined {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return undefined;
}

export const auth0 = new Auth0Client({
  appBaseUrl: resolveAppBaseUrl(),
  authorizationParameters: {
    scope: "openid profile email offline_access",
  },
  enableConnectAccountEndpoint: true,
});
