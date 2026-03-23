/**
 * Spike route: Token Vault → Google Sheets
 *
 * Tests the Auth0 Token Vault flow for exchanging an Auth0 refresh token
 * for a Google access token via the "google-oauth2" federated connection,
 * then fetches data from a Google Sheet.
 *
 * NOT production code — throwaway spike.
 */

import { NextResponse } from "next/server";
import { z } from "zod/v4";

import { auth0 } from "@/lib/auth0";
import type { Tool } from "ai";
import { Auth0AI, getAccessTokenFromTokenVault } from "@auth0/ai-vercel";
import { TokenVaultInterrupt } from "@auth0/ai/interrupts";

class SheetsApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: string
  ) {
    super(`Google Sheets API ${status}`);
  }
}

// Lazy-init: Auth0AI.withTokenVault validates Auth0 client config via Zod at
// call time, which crashes during Next.js build when env vars aren't set.
// Deferring to first request avoids the build-time module evaluation error.
let fetchSheetTool: Tool;

function getFetchSheetTool() {
  if (!fetchSheetTool) {
    const auth0AI = new Auth0AI();

    const withGoogleToken = auth0AI.withTokenVault({
      connection: "google-oauth2",
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      refreshToken: async () => {
        const session = await auth0.getSession();
        return session?.tokenSet.refreshToken;
      },
    });

    fetchSheetTool = withGoogleToken({
      description: "Fetch product data from Google Sheets",
      inputSchema: z.object({}),
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      execute: async (_input: Record<string, never>) => {
        const accessToken = getAccessTokenFromTokenVault();

        const sheetId = process.env.GOOGLE_SHEET_ID;
        if (!sheetId) {
          throw new Error("GOOGLE_SHEET_ID env var is not set");
        }

        const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Products`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!res.ok) {
          const body = await res.text();
          throw new SheetsApiError(res.status, body);
        }

        return await res.json();
      },
    });
  }
  return fetchSheetTool;
}

export async function GET() {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ENABLE_SPIKE !== "true"
  ) {
    return new Response(null, { status: 404 });
  }

  try {
    const tool = getFetchSheetTool();

    // The wrapper replaces execute with protect(), which needs (input, ctx).
    // Cast to bypass the original Tool type that doesn't expose the ctx arg.
    const execute = tool.execute as (
      input: Record<string, never>,
      ctx: { toolCallId: string; messages: unknown[] }
    ) => Promise<unknown>;

    const result = await execute(
      {} as Record<string, never>,
      { toolCallId: "spike", messages: [] }
    );

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof TokenVaultInterrupt) {
      return NextResponse.json(
        {
          error: "google_connection_required",
          message:
            "You need to connect your Google account before using this feature. " +
            "Please link your Google account in your Auth0 profile settings.",
        },
        { status: 403 }
      );
    }
    if (err instanceof SheetsApiError) {
      return NextResponse.json(
        { error: err.message, body: err.body },
        { status: err.status }
      );
    }
    if (err instanceof Error && err.message.includes("GOOGLE_SHEET_ID")) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    throw err;
  }
}
