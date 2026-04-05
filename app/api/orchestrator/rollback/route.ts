/**
 * Rollback API route — builds a reversal changeset from an executed original.
 *
 * POST /api/orchestrator/rollback
 * Body: { changeSet: ChangeSet }
 * Returns: { changeSet: ChangeSet } (reversal draft in "draft" status)
 *
 * The returned draft is then executed via the existing
 * POST /api/orchestrator/execute endpoint.
 */

import { NextResponse } from "next/server";
import { z } from "zod/v4";

import { auth0 } from "@/lib/auth0";
import { apiError, BAD_REQUEST, INTERNAL_ERROR, UNAUTHORIZED } from "@/lib/api-error";
import {
  buildRollbackChangeSet,
  RollbackValidationError,
} from "@/lib/changeset/rollback-builder";
import type { ChangeSet } from "@/lib/changeset/types";
import { isDemoSession } from "@/lib/demo/config.server";
import { DEMO_SCENARIOS } from "@/lib/demo/scenarios";

const OperationDiffSchema = z.object({
  field: z.string(),
  before: z.union([z.string(), z.number(), z.boolean()]),
  after: z.union([z.string(), z.number(), z.boolean()]),
});

const OperationResultSchema = z.object({
  operationId: z.string(),
  status: z.enum(["success", "failure", "skipped"]),
  error: z.string().optional(),
  duration: z.number(),
});

const OperationSchema = z.object({
  id: z.string(),
  agent: z.enum(["reader", "writer", "notifier"]),
  action: z.string(),
  target: z.string(),
  tier: z.number(),
  policyExplanation: z.record(z.string(), z.unknown()),
  diff: z.array(OperationDiffSchema),
  rollback: z.object({
    action: z.string(),
    params: z.record(z.string(), z.unknown()),
  }),
});

const RequestBody = z.object({
  changeSet: z.object({
    id: z.string(),
    requestedBy: z.string(),
    originalPrompt: z.string(),
    createdAt: z.string(),
    status: z.enum([
      "draft",
      "pending_approval",
      "approved",
      "executing",
      "completed",
      "partial_failure",
      "expired",
      "rolled_back",
    ]),
    operations: z.array(OperationSchema),
    riskSummary: z.record(z.string(), z.unknown()),
    approval: z.record(z.string(), z.unknown()).optional(),
    execution: z
      .object({
        executedAt: z.string(),
        results: z.array(OperationResultSchema),
        receipt: z.record(z.string(), z.unknown()),
      })
      .optional(),
    rollbackOf: z.string().optional(),
  }),
});

export async function POST(request: Request) {
  // ── Demo mode: return pre-built rollback scenario ─────────────────
  if (await isDemoSession()) {
    const rollbackScenario = DEMO_SCENARIOS.find((s) => s.id === "scenario-4");
    if (rollbackScenario) {
      return NextResponse.json({ changeSet: rollbackScenario.changeSet });
    }
    return apiError(BAD_REQUEST, "No rollback scenario available in demo mode", 400);
  }

  // ── Production mode ───────────────────────────────────────────────
  const session = await auth0.getSession();
  if (!session) {
    return apiError(UNAUTHORIZED, "Unauthorized", 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(BAD_REQUEST, "Malformed JSON in request body", 400);
  }

  const parsed = RequestBody.safeParse(body);
  if (!parsed.success) {
    return apiError(BAD_REQUEST, "Invalid request", 400);
  }

  const changeSet = parsed.data.changeSet;

  if (changeSet.status !== "completed" && changeSet.status !== "partial_failure") {
    return apiError(
      BAD_REQUEST,
      `Change set must be "completed" or "partial_failure" to roll back. Got "${changeSet.status}".`,
      400,
    );
  }

  if (changeSet.rollbackOf) {
    return apiError(
      BAD_REQUEST,
      "Cannot roll back a changeset that is itself a rollback.",
      400,
    );
  }

  if (!changeSet.execution) {
    return apiError(BAD_REQUEST, "Change set has no execution data.", 400);
  }

  const routeStart = performance.now();
  console.log(
    `[rollback] POST /api/orchestrator/rollback — changeSet: ${changeSet.id.slice(0, 8)}`
  );

  try {
    // Zod validates structure; cast to ChangeSet for the enum types
    // (tier: RiskTier, policyExplanation: PolicyDecision) that Zod
    // cannot express without duplicating the full domain schema.
    const initiator =
      session.user.email ?? session.user.name ?? session.user.sub;
    const reversal = await buildRollbackChangeSet(
      changeSet as unknown as ChangeSet,
      initiator,
    );

    console.log(
      `[rollback] Built reversal ${reversal.id.slice(0, 8)} in ${Math.round(performance.now() - routeStart)}ms — ` +
        `${reversal.operations.length} operations, maxTier: ${reversal.riskSummary.maxTier}`
    );

    return NextResponse.json({ changeSet: reversal });
  } catch (err) {
    if (err instanceof RollbackValidationError) {
      console.error("[rollback] Validation error:", err.message);
      return apiError(BAD_REQUEST, err.message, 400);
    }
    console.error("[rollback] Internal error:", err);
    return apiError(INTERNAL_ERROR, "Internal server error", 500);
  }
}
