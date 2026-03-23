/**
 * Spike route: CIBA + Guardian push notifications
 *
 * Tests the Auth0 CIBA (Client-Initiated Backchannel Authentication) flow
 * with Guardian push notifications. This is the mechanism that lets agents
 * request human approval for write operations (Tier 2/3).
 *
 * Prerequisites (Auth0 dashboard):
 * - CIBA grant type enabled on the application
 * - Guardian Push Notifications enabled under Security > Multi-factor Auth
 * - Test user enrolled in MFA with Guardian app
 * - (Optional) RAR support enabled for "commerce_changeset" type
 *
 * Known limitations:
 * - Block mode waits up to requestedExpiry (120s) for Guardian response,
 *   which may exceed serverless function timeouts. Fine for local dev.
 * - RAR (authorizationDetails) requires enterprise plan — the Management
 *   API rejects authorization_details on client grants for free/dev plans.
 *   Set AUTH0_CIBA_AUDIENCE to test RAR when available.
 *
 * Spike findings:
 * - CIBA works on free-tier Auth0 tenants (no enterprise required).
 * - binding_message allows only: alphanumerics, whitespace, +-_.,:#
 *   (no $, unicode arrows, etc.)
 * - Audience must be omitted unless RAR is used; if passed without
 *   proper client grant config, Auth0 rejects with "not authorized".
 * - SDK method is withAsyncAuthorization() not withAsyncUserConfirmation()
 *   as the PRD states.
 *
 * NOT production code — throwaway spike.
 */

import { NextResponse } from "next/server";
import { z } from "zod/v4";

import { auth0 } from "@/lib/auth0";
import type { Tool } from "ai";
import {
  Auth0AI,
  getAsyncAuthorizationCredentials,
  setAIContext,
} from "@auth0/ai-vercel";
import {
  AsyncAuthorizationInterrupt,
  AccessDeniedInterrupt,
  UserDoesNotHavePushNotificationsInterrupt,
  AuthorizationRequestExpiredInterrupt,
  AuthorizationPendingInterrupt,
  AuthorizationPollingInterrupt,
  InvalidGrantInterrupt,
} from "@auth0/ai/interrupts";

// Lazy-init: Auth0AI validates config via Zod at call time, which crashes
// during Next.js build when env vars aren't set. Deferring to first request
// avoids the build-time module evaluation error.
let cibaApproveTool: Tool;

function getCibaApproveTool() {
  if (!cibaApproveTool) {
    const auth0AI = new Auth0AI();

    const withCibaApproval = auth0AI.withAsyncAuthorization({
      userID: async () => {
        const session = await auth0.getSession();
        return session!.user.sub;
      },
      bindingMessage: async () =>
        "Approve price change: STR-001 Classic Runner 89.99 to 69.99",
      scopes: ["openid"],
      // Audience is required when authorizationDetails (RAR) is used.
      // Without an audience, we skip RAR to avoid Auth0 rejection.
      ...(process.env.AUTH0_CIBA_AUDIENCE
        ? {
            audience: process.env.AUTH0_CIBA_AUDIENCE,
            authorizationDetails: async () => [
              {
                type: "commerce_changeset",
                changeset_id: "CS-2024-001",
                action: "approve_price_change",
                sku: "STR-001",
                old_price: 89.99,
                new_price: 69.99,
                currency: "USD",
              },
            ],
          }
        : {}),
      requestedExpiry: 120,
      onAuthorizationRequest: "block",
    });

    cibaApproveTool = withCibaApproval({
      description: "Request CIBA approval for a commerce price change",
      inputSchema: z.object({}),
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      execute: async (_input: Record<string, never>) => {
        const credentials = getAsyncAuthorizationCredentials();
        if (!credentials) {
          return {
            approved: false,
            error: "no_credentials",
            message: "CIBA flow completed but did not yield credentials",
          };
        }

        return {
          approved: true,
          scopes: credentials.scopes,
          expiresIn: credentials.expiresIn,
          tokenType: credentials.tokenType,
          hasAuthorizationDetails:
            !!credentials.authorizationDetails?.length,
          authorizationDetails: credentials.authorizationDetails,
          accessTokenPrefix:
            credentials.accessToken.substring(0, 20) + "...",
        };
      },
    });
  }
  return cibaApproveTool;
}

export async function GET() {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ENABLE_SPIKE !== "true"
  ) {
    return new Response(null, { status: 404 });
  }

  const session = await auth0.getSession();
  if (!session) {
    return NextResponse.json(
      {
        error: "unauthenticated",
        message: "Login required. Visit /auth/login first.",
      },
      { status: 401 }
    );
  }

  try {
    setAIContext({ threadID: `ciba-spike-${crypto.randomUUID()}` });
    const tool = getCibaApproveTool();

    // The wrapper replaces execute with protect(), which needs (input, ctx).
    // Cast to bypass the original Tool type that doesn't expose the ctx arg.
    const execute = tool.execute as (
      input: Record<string, never>,
      ctx: { toolCallId: string; messages: unknown[] }
    ) => Promise<unknown>;

    const result = await execute(
      {} as Record<string, never>,
      { toolCallId: "ciba-spike", messages: [] }
    );

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AccessDeniedInterrupt) {
      return NextResponse.json(
        {
          error: "access_denied",
          message: "User rejected the authorization request.",
        },
        { status: 403 }
      );
    }
    if (err instanceof UserDoesNotHavePushNotificationsInterrupt) {
      return NextResponse.json(
        {
          error: "no_push_notifications",
          message:
            "User does not have Guardian push notifications enrolled. " +
            "Install the Auth0 Guardian app and enroll in MFA first.",
        },
        { status: 422 }
      );
    }
    if (err instanceof AuthorizationRequestExpiredInterrupt) {
      return NextResponse.json(
        {
          error: "request_expired",
          message:
            "The CIBA authorization request expired before the user responded.",
        },
        { status: 408 }
      );
    }
    if (err instanceof AuthorizationPendingInterrupt) {
      return NextResponse.json(
        {
          error: "authorization_pending",
          message:
            "Authorization is still pending (unexpected in block mode).",
        },
        { status: 202 }
      );
    }
    if (err instanceof AuthorizationPollingInterrupt) {
      return NextResponse.json(
        {
          error: "polling_slow_down",
          message: "Polling too frequently (unexpected in block mode).",
        },
        { status: 429 }
      );
    }
    if (err instanceof InvalidGrantInterrupt) {
      return NextResponse.json(
        {
          error: "invalid_grant",
          message:
            "The authorization grant is invalid or expired. " +
            "CIBA may not be available on this Auth0 plan.",
        },
        { status: 400 }
      );
    }
    if (err instanceof AsyncAuthorizationInterrupt) {
      return NextResponse.json(
        {
          error: "async_authorization_error",
          message: (err as Error).message,
        },
        { status: 500 }
      );
    }
    throw err;
  }
}
