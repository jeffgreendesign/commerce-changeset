/**
 * Spike route: Connected Accounts flow for Token Vault.
 *
 * Links the user's Google account via Auth0 Connected Accounts so that
 * Token Vault stores the Google refresh token for federated token exchange.
 *
 * Requires: own Google OAuth credentials (not Auth0 dev keys) on the
 * google-oauth2 connection.
 *
 * NOT production code — throwaway spike.
 */

import { NextResponse } from "next/server";
import { auth0, resolveAppBaseUrl } from "@/lib/auth0";

export async function GET(request: Request) {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ENABLE_SPIKE !== "true"
  ) {
    return new Response(null, { status: 404 });
  }

  const url = new URL(request.url);
  const step = url.searchParams.get("step");
  const session = await auth0.getSession();
  const domain = process.env.AUTH0_DOMAIN;
  const issuer = `https://${domain}`;
  const appBaseUrl = resolveAppBaseUrl() ?? new URL(request.url).origin;

  // Check if already connected
  if (session && !step) {
    try {
      await auth0.getAccessTokenForConnection({ connection: "google-oauth2" });
      return NextResponse.redirect(new URL("/api/spike/token-vault", appBaseUrl));
    } catch {
      // Not connected — continue
    }
  }

  // Step "do-connect": Use the SDK's connectAccount() now that we have
  // a session with the /me/ audience and create:me:connected_accounts scope
  if (step === "do-connect" && session) {
    // The SDK's connectAccount() will:
    // 1. Get an access token for the /me/ audience
    // 2. Call /me/v1/connected-accounts/connect
    // 3. Store transaction state with CONNECT_CODE response type
    // 4. Redirect to Google
    // 5. On callback, complete the connect flow and store the refresh token
    return auth0.connectAccount({
      connection: "google-oauth2",
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      returnTo: "/api/spike/token-vault",
    });
  }

  // Step 0: Login with My Account audience so the session has the right scope
  // for connectAccount() to get a proper JWT
  const loginUrl = new URL("/auth/login", appBaseUrl);
  loginUrl.searchParams.set("audience", `${issuer}/me/`);
  loginUrl.searchParams.set(
    "scope",
    "openid profile email offline_access create:me:connected_accounts"
  );
  loginUrl.searchParams.set("connection", "google-oauth2");
  loginUrl.searchParams.set("returnTo", "/api/spike/connect-google?step=do-connect");

  return NextResponse.redirect(loginUrl.toString());
}
