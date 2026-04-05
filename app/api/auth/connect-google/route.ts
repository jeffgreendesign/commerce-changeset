/**
 * Google Connected Accounts linking endpoint.
 *
 * GET /api/auth/connect-google
 *
 * Links the user's Google account via Auth0 Connected Accounts so that
 * Token Vault can store and exchange the Google refresh token.
 *
 * Flow:
 * 1. If already connected, redirect to /dashboard.
 * 2. Re-authenticate with the /me/ audience and create:me:connected_accounts scope.
 * 3. On return (?step=do-connect), call auth0.connectAccount() to complete the link.
 */

import { NextResponse } from "next/server";
import { auth0, resolveAppBaseUrl } from "@/lib/auth0";
import { apiError, UNAUTHORIZED } from "@/lib/api-error";

export async function GET(request: Request) {
  const session = await auth0.getSession();
  if (!session) {
    return apiError(UNAUTHORIZED, "Authentication required", 401);
  }

  const url = new URL(request.url);
  const step = url.searchParams.get("step");
  const domain = process.env.AUTH0_DOMAIN;
  if (!domain) {
    throw new Error("AUTH0_DOMAIN environment variable is not set");
  }
  const issuer = `https://${domain}`;
  const appBaseUrl = resolveAppBaseUrl() ?? new URL(request.url).origin;

  // If already connected, redirect to dashboard (skip with ?force=true to re-link)
  const force = url.searchParams.get("force") === "true";
  if (!step && !force) {
    try {
      await auth0.getAccessTokenForConnection({ connection: "google-oauth2" });
      return NextResponse.redirect(new URL("/dashboard", appBaseUrl));
    } catch {
      // Not connected — continue to initiate the linking flow
    }
  }

  // Complete the connection after re-authentication with /me/ audience
  if (step === "do-connect") {
    return auth0.connectAccount({
      connection: "google-oauth2",
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      returnTo: "/dashboard",
    });
  }

  // Initiate: re-authenticate with the My Account API audience and scope
  const loginUrl = new URL("/auth/login", appBaseUrl);
  loginUrl.searchParams.set("audience", `${issuer}/me/`);
  loginUrl.searchParams.set(
    "scope",
    "openid profile email offline_access create:me:connected_accounts",
  );
  loginUrl.searchParams.set("connection", "google-oauth2");
  loginUrl.searchParams.set(
    "returnTo",
    "/api/auth/connect-google?step=do-connect",
  );

  return NextResponse.redirect(loginUrl.toString());
}
