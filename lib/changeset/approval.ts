/**
 * CIBA approval flow — requests human approval for a change set via
 * Auth0 CIBA + Guardian push notifications.
 *
 * Extracted from the CIBA spike (app/api/spike/ciba/route.ts) into a
 * reusable module with dynamic binding messages derived from the
 * change set content.
 *
 * Uses "block" mode: the SDK polls internally and resolves when the
 * user approves, denies, or the request expires (up to 120s).
 *
 * Matches the spike's singleton pattern: the tool and wrapper are
 * created once; dynamic values (userId, bindingMessage) are read from
 * module-level variables at invocation time via async callbacks.
 */

import type { Tool } from "ai";
import {
  Auth0AI,
  getAsyncAuthorizationCredentials,
  setAIContext,
} from "@auth0/ai-vercel";
import {
  AccessDeniedInterrupt,
  UserDoesNotHavePushNotificationsInterrupt,
  AuthorizationRequestExpiredInterrupt,
  AsyncAuthorizationInterrupt,
} from "@auth0/ai/interrupts";
import { z } from "zod/v4";

import type { ChangeSet, ChangeSetApproval } from "./types";

// ── Types ────────────────────────────────────────────────────────────

export type ApprovalResult =
  | { success: true; approval: ChangeSetApproval }
  | { success: false; code: string; message: string };

// ── Binding message ──────────────────────────────────────────────────

/** Characters allowed in CIBA binding messages. */
const ALLOWED_CHARS = /[^a-zA-Z0-9\s+\-_.,:#]/g;
const MAX_BINDING_LENGTH = 64;

function sanitizeBindingMessage(msg: string): string {
  return msg.replace(ALLOWED_CHARS, "").slice(0, MAX_BINDING_LENGTH).trim();
}

function buildBindingMessage(changeSet: ChangeSet): string {
  const writerOps = changeSet.operations.filter(
    (op) => op.agent === "writer"
  );

  if (writerOps.length === 0) {
    return sanitizeBindingMessage("Approve change set execution");
  }

  const products = [...new Set(writerOps.map((op) => op.target))];

  // Must fit in 64 chars. Use short format.
  const msg =
    products.length <= 2
      ? `Approve ${writerOps.length} ops: ${products.join(", ")}`
      : `Approve ${writerOps.length} ops on ${products.length} products`;

  return sanitizeBindingMessage(msg);
}

// ── Singleton CIBA tool ──────────────────────────────────────────────
// Matches the spike pattern: create once, read dynamic values via
// module-level variables at invocation time.

let _currentUserId = "";
let _currentBindingMessage = "";

let cibaApprovalTool: Tool;

function getCibaApprovalTool(): Tool {
  if (!cibaApprovalTool) {
    const auth0AI = new Auth0AI();

    const withCibaApproval = auth0AI.withAsyncAuthorization({
      userID: async () => _currentUserId,
      bindingMessage: async () => _currentBindingMessage,
      scopes: ["openid"],
      requestedExpiry: 120,
      onAuthorizationRequest: "block",
    });

    cibaApprovalTool = withCibaApproval({
      description: "Request CIBA approval for change set execution",
      inputSchema: z.object({}),
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      execute: async (_input: Record<string, never>) => {
        const credentials = getAsyncAuthorizationCredentials();
        if (!credentials) {
          return { approved: false as const };
        }
        return {
          approved: true as const,
          scopes: credentials.scopes,
          hasAuthorizationDetails:
            !!credentials.authorizationDetails?.length,
          authorizationDetails: credentials.authorizationDetails,
        };
      },
    });
  }
  return cibaApprovalTool;
}

// ── Approval function ────────────────────────────────────────────────

export async function requestApproval(
  changeSet: ChangeSet,
  userId: string
): Promise<ApprovalResult> {
  // Set dynamic values that the singleton callbacks read at invocation time.
  _currentUserId = userId;
  _currentBindingMessage = buildBindingMessage(changeSet);

  const requireApproval = changeSet.operations.filter((op) => op.tier >= 2).length;
  console.log(`[approval] Requesting CIBA for ${requireApproval} operations requiring approval — binding: "${_currentBindingMessage}"`);

  setAIContext({
    threadID: `ciba-approval-${changeSet.id}`,
  });

  const tool = getCibaApprovalTool();

  // Manually invoke the wrapped tool (same pattern as CIBA spike).
  // The wrapper replaces execute with protect(), which expects (input, ctx).
  const execute = tool.execute as (
    input: Record<string, never>,
    ctx: { toolCallId: string; messages: unknown[] }
  ) => Promise<{
    approved: boolean;
    scopes?: string[];
    authorizationDetails?: unknown[];
  }>;

  try {
    const result = await execute(
      {} as Record<string, never>,
      { toolCallId: `ciba-${changeSet.id}`, messages: [] }
    );

    // The wrapper may return interrupts as result objects instead of throwing.
    const resultObj = result as Record<string, unknown>;
    if (resultObj.name === "AUTH0_AI_INTERRUPT") {
      const code = String(resultObj.code ?? "ciba_error");
      const message = String(resultObj.message ?? "CIBA authorization failed");
      return { success: false, code, message };
    }

    if (!result.approved) {
      return {
        success: false,
        code: "no_credentials",
        message:
          "CIBA flow completed but did not yield credentials.",
      };
    }

    console.log(`[approval] CIBA result: approved`);
    const approval: ChangeSetApproval = {
      approvedBy: userId,
      approvedAt: new Date().toISOString(),
      cibaTransactionId: `ciba-${changeSet.id}`,
      scopesGranted: result.scopes ?? ["openid"],
      authorizationDetails: Array.isArray(result.authorizationDetails)
        ? (result.authorizationDetails as ChangeSetApproval["authorizationDetails"])
        : [],
    };

    return { success: true, approval };
  } catch (err) {
    if (err instanceof AccessDeniedInterrupt) {
      console.log(`[approval] CIBA result: denied`);
      return {
        success: false,
        code: "access_denied",
        message: "User rejected the authorization request.",
      };
    }
    if (err instanceof AuthorizationRequestExpiredInterrupt) {
      console.log(`[approval] CIBA result: expired`);
      return {
        success: false,
        code: "expired",
        message:
          "The CIBA authorization request expired before the user responded.",
      };
    }
    if (err instanceof UserDoesNotHavePushNotificationsInterrupt) {
      return {
        success: false,
        code: "no_push",
        message:
          "User does not have Guardian push notifications enrolled. " +
          "Install the Auth0 Guardian app and enroll in MFA first.",
      };
    }
    if (err instanceof AsyncAuthorizationInterrupt) {
      return {
        success: false,
        code: "ciba_error",
        message: (err as Error).message,
      };
    }
    throw err;
  }
}
