/**
 * Spike route: Connected Accounts flow via My Account API.
 *
 * Step 1: If no session with My Account scope, redirect to login with /me/ audience
 * Step 2: Use the JWT to call My Account connected-accounts/connect
 * Step 3: Redirect to Google consent via the ticket
 *
 * NOT production code — throwaway spike.
 */

import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";

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
  const appBaseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";

  // Step 1: Check if we already have a Google token in Token Vault
  if (session) {
    try {
      await auth0.getAccessTokenForConnection({ connection: "google-oauth2" });
      return NextResponse.redirect(new URL("/api/spike/token-vault", appBaseUrl));
    } catch {
      // Not connected — continue
    }
  }

  // Step 2: After login with /me/ audience, call the Connected Accounts API
  if (step === "connect" && session) {
    const tokenResult = await auth0.getAccessToken({
      audience: `${issuer}/me/`,
      scope: "create:me:connected_accounts",
    });

    console.error("[connect-google] Token scope:", tokenResult.scope);

    const connectRes = await fetch(
      `${issuer}/me/v1/connected-accounts/connect`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenResult.token}`,
        },
        body: JSON.stringify({
          connection: "google-oauth2",
          redirect_uri: `${appBaseUrl}/auth/callback`,
          scopes: ["https://www.googleapis.com/auth/spreadsheets"],
        }),
      }
    );

    const connectBody = await connectRes.text();
    console.error("[connect-google] Connect API:", connectRes.status, connectBody.substring(0, 300));

    if (!connectRes.ok) {
      return NextResponse.json(
        {
          error: "connect_failed",
          status: connectRes.status,
          body: JSON.parse(connectBody),
          tokenScope: tokenResult.scope,
        },
        { status: connectRes.status }
      );
    }

    const { connect_uri, connect_params } = JSON.parse(connectBody);
    const redirectUrl = `${connect_uri}?ticket=${encodeURIComponent(connect_params.ticket)}`;
    console.error("[connect-google] Redirecting to:", redirectUrl);
    return NextResponse.redirect(redirectUrl);
  }

  // Step 0: Login with My Account audience to get create:me:connected_accounts scope
  const loginUrl = new URL("/auth/login", appBaseUrl);
  loginUrl.searchParams.set("audience", `${issuer}/me/`);
  loginUrl.searchParams.set(
    "scope",
    "openid profile email offline_access create:me:connected_accounts"
  );
  loginUrl.searchParams.set("connection", "google-oauth2");
  loginUrl.searchParams.set("returnTo", "/api/spike/connect-google?step=connect");

  return NextResponse.redirect(loginUrl.toString());
}
