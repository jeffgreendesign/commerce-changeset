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
import { buildRollbackChangeSet } from "@/lib/changeset/rollback-builder";
import type { ChangeSet } from "@/lib/changeset/types";

const RequestBody = z.object({
  changeSet: z.record(z.string(), z.unknown()),
});

export async function POST(request: Request) {
  const session = await auth0.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await request.json();
  const parsed = RequestBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const changeSet = parsed.data.changeSet as unknown as ChangeSet;

  if (changeSet.status !== "completed" && changeSet.status !== "partial_failure") {
    return NextResponse.json(
      {
        error: "invalid_status",
        message: `Change set must be "completed" or "partial_failure" to roll back. Got "${changeSet.status}".`,
      },
      { status: 400 }
    );
  }

  if (changeSet.rollbackOf) {
    return NextResponse.json(
      {
        error: "already_rollback",
        message: "Cannot roll back a changeset that is itself a rollback.",
      },
      { status: 400 }
    );
  }

  if (!changeSet.execution) {
    return NextResponse.json(
      {
        error: "no_execution",
        message: "Change set has no execution data.",
      },
      { status: 400 }
    );
  }

  const routeStart = performance.now();
  console.log(
    `[rollback] POST /api/orchestrator/rollback — changeSet: ${changeSet.id.slice(0, 8)}`
  );

  try {
    const reversal = await buildRollbackChangeSet(changeSet);

    console.log(
      `[rollback] Built reversal ${reversal.id.slice(0, 8)} in ${Math.round(performance.now() - routeStart)}ms — ` +
        `${reversal.operations.length} operations, maxTier: ${reversal.riskSummary.maxTier}`
    );

    return NextResponse.json({ changeSet: reversal });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to build rollback changeset";
    console.error("[rollback] Error:", message);
    return NextResponse.json(
      { error: "rollback_failed", message },
      { status: 400 }
    );
  }
}
