/**
 * Rollback builder — converts a completed changeset into a reversal draft.
 *
 * Takes each successfully-executed writer operation, inverts its diffs
 * (swap before/after), and runs the result through the standard
 * buildChangeSet() pipeline so policy evaluation, risk tiers, and new
 * rollback instructions are computed normally.
 */

import { buildChangeSet } from "./builder";
import type { ParsedOperation } from "./builder";
import type { ChangeSet } from "./types";

/**
 * Build a reversal changeset from an executed original.
 *
 * Only writer operations that succeeded are reversed — failed operations
 * had no effect and need no reversal. The resulting draft goes through
 * the normal execution pipeline (including CIBA approval for writes).
 */
export async function buildRollbackChangeSet(
  original: ChangeSet
): Promise<ChangeSet> {
  if (original.status !== "completed" && original.status !== "partial_failure") {
    throw new Error(
      `Cannot roll back a changeset with status "${original.status}". ` +
        `Only "completed" or "partial_failure" changesets can be rolled back.`
    );
  }

  if (!original.execution) {
    throw new Error("Cannot roll back a changeset with no execution data.");
  }

  if (original.rollbackOf) {
    throw new Error("Cannot roll back a rollback changeset.");
  }

  const succeededIds = new Set(
    original.execution.results
      .filter((r) => r.status === "success")
      .map((r) => r.operationId)
  );

  const writerOps = original.operations.filter(
    (op) => op.agent === "writer" && succeededIds.has(op.id)
  );

  if (writerOps.length === 0) {
    throw new Error("No successfully-executed writer operations to roll back.");
  }

  const reversedOps: ParsedOperation[] = writerOps.map((op) => {
    const invertedDiffs = op.diff.map((d) => ({
      field: d.field,
      before: d.after,
      after: d.before,
    }));

    const affectedRecords =
      op.action === "bulk_price_change" ? op.diff.length : 1;

    let priceChangePercent: number | undefined;
    if (op.action === "update_price" || op.action === "bulk_price_change") {
      const firstDiff = invertedDiffs[0];
      if (firstDiff) {
        const from = Number(firstDiff.before);
        const to = Number(firstDiff.after);
        if (from > 0) {
          priceChangePercent = Math.abs(
            Math.round(((from - to) / from) * 100)
          );
        }
      }
    }

    return {
      agent: "writer" as const,
      action: op.rollback.action,
      target: op.target,
      diff: invertedDiffs,
      operationType: "write" as const,
      affectedRecords,
      priceChangePercent,
    };
  });

  console.log(
    `[rollback-builder] Building reversal for ${original.id.slice(0, 8)} — ` +
      `${reversedOps.length} operation(s) to reverse`
  );

  const reversal = await buildChangeSet({
    requestedBy: original.requestedBy,
    originalPrompt: `Rollback of changeset ${original.id.slice(0, 8)}`,
    operations: reversedOps,
  });

  reversal.rollbackOf = original.id;

  return reversal;
}
