/**
 * Change Set executor — orchestrates the full execution pipeline:
 *
 *   1. CIBA approval via Guardian push notification
 *   2. Writer Agent executes approved write operations
 *   3. Verification read-back via Reader Agent
 *   4. Execution receipt with audit hash
 *
 * Returns a new ChangeSet (not mutated) with status, approval, and
 * execution fields populated.
 */

import { runWriterAgent } from "@/lib/agents/writer";
import { runReaderAgent } from "@/lib/agents/reader";
import { requestApproval } from "./approval";
import type {
  ChangeSet,
  ChangeSetExecution,
  ExecutionReceipt,
  Operation,
  OperationResult,
  VerificationCheck,
} from "./types";

// ── Types ────────────────────────────────────────────────────────────

export interface ExecuteChangeSetResult {
  changeSet: ChangeSet;
  error?: { code: string; message: string };
}

// ── Verification ─────────────────────────────────────────────────────

/** Extract the SKU prefix from an operation target (e.g. "STR-001" from "STR-001 Classic Runner"). */
function extractSku(target: string): string | undefined {
  return target.match(/^(STR-\d{3})/)?.[1];
}

/** Map action names to the header name in the Products sheet. */
const ACTION_FIELD_MAP: Record<string, string> = {
  update_price: "Promo Price",
  set_promo_status: "Promo Active",
};

/**
 * Build verification checks by comparing expected diff values against
 * actual product state from the Reader Agent's tool results.
 */
function buildVerificationChecks(
  writerOps: Operation[],
  readerToolResults: Array<{ toolName: string; result: unknown }>
): VerificationCheck[] {
  // Find the get_products result from the reader's tool results.
  const productsResult = readerToolResults.find(
    (tr) => tr.toolName === "get_products"
  );
  // The reader result may be missing or structured differently.
  const rawResult = productsResult?.result as
    | { products?: Record<string, string>[] }
    | undefined;
  const products = rawResult?.products;

  if (!products) {
    return writerOps.flatMap((op) =>
      op.diff.map((d) => ({
        operationId: op.id,
        field: d.field,
        expected: d.after,
        actual: "unknown" as string,
        status: "warning" as const,
      }))
    );
  }

  const checks: VerificationCheck[] = [];

  for (const op of writerOps) {
    const sku = extractSku(op.target);
    const product = products.find((p) => p["SKU"] === sku);
    const fieldName = ACTION_FIELD_MAP[op.action];

    for (const diff of op.diff) {
      const headerName = fieldName ?? diff.field;
      const actual = product?.[headerName] ?? "not_found";

      // Normalize for comparison: trim whitespace, case-insensitive for booleans
      const expectedStr = String(diff.after).trim().toUpperCase();
      const actualStr = String(actual).trim().toUpperCase();

      checks.push({
        operationId: op.id,
        field: diff.field,
        expected: diff.after,
        actual,
        status: actualStr === expectedStr ? "pass" : "fail",
      });
    }
  }

  return checks;
}

// ── Receipt generation ───────────────────────────────────────────────

function generateRollbackSummary(changeSet: ChangeSet): string {
  const rollbacks = changeSet.operations
    .filter((op) => op.agent === "writer")
    .map(
      (op) =>
        `${op.action}(${op.target}): revert to ${JSON.stringify(op.rollback.params)}`
    )
    .join("; ");
  return `To revert change set ${changeSet.id}: ${rollbacks}`;
}

async function computeAuditHash(payload: string): Promise<string> {
  const encoded = new TextEncoder().encode(payload);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return (
    "sha256:" + hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
  );
}

async function buildExecutionReceipt(
  changeSet: ChangeSet,
  userId: string,
  writerResults: OperationResult[],
  writerDuration: number,
  verificationChecks: VerificationCheck[],
  verificationDuration: number
): Promise<ExecutionReceipt> {
  const now = new Date().toISOString();
  const checksRun = verificationChecks.length;
  const checksPassed = verificationChecks.filter(
    (c) => c.status === "pass"
  ).length;

  const receipt: ExecutionReceipt = {
    changeSetId: changeSet.id,
    executedBy: userId,
    executedAt: now,
    oboChain: {
      user: userId,
      delegatedTo: ["writer", "reader"],
    },
    agentDelegations: [
      {
        agent: "writer",
        actingOnBehalfOf: userId,
        toolsGranted: ["update_price", "set_promo_status"],
        contextReceived: "approved change set operations only",
        tokenExchangeId: `tv_exch_${crypto.randomUUID().slice(0, 8)}`,
        operationsPerformed: writerResults
          .filter((r) => r.status === "success")
          .map((r) => r.operationId),
        duration: writerDuration,
      },
      {
        agent: "reader",
        actingOnBehalfOf: userId,
        toolsGranted: ["get_products"],
        contextReceived: "verification read-back",
        tokenExchangeId: `tv_exch_${crypto.randomUUID().slice(0, 8)}`,
        operationsPerformed: [`verification: ${checksRun} checks`],
        duration: verificationDuration,
      },
    ],
    verification: {
      checksRun,
      checksPassed,
      results: verificationChecks,
    },
    rollbackInstructions: generateRollbackSummary(changeSet),
    auditHash: "",
  };

  // Compute audit hash over the receipt (excluding the hash field itself).
  receipt.auditHash = await computeAuditHash(JSON.stringify(receipt));

  return receipt;
}

// ── Executor ─────────────────────────────────────────────────────────

export async function executeChangeSet(
  changeSet: ChangeSet,
  refreshToken: string,
  userId: string
): Promise<ExecuteChangeSetResult> {
  if (changeSet.status !== "draft") {
    throw new Error(
      `Cannot execute change set in "${changeSet.status}" status. Expected "draft".`
    );
  }

  // Step 1: Request CIBA approval
  let cs: ChangeSet = { ...changeSet, status: "pending_approval" };

  const approvalResult = await requestApproval(cs, userId);

  if (!approvalResult.success) {
    return {
      changeSet: {
        ...cs,
        status: approvalResult.code === "expired" ? "expired" : "draft",
      },
      error: {
        code: approvalResult.code,
        message: approvalResult.message,
      },
    };
  }

  // Step 2: Mark approved
  cs = {
    ...cs,
    status: "approved",
    approval: approvalResult.approval,
  };

  // Step 3: Execute writer operations
  cs = { ...cs, status: "executing" };

  const writerOps = cs.operations.filter((op) => op.agent === "writer");
  const writerResult = await runWriterAgent(writerOps, refreshToken);

  // Step 4: Verification read-back
  const verifyStart = performance.now();
  const readerResult = await runReaderAgent(
    "Show me all products with their current Promo Price and Promo Active status.",
    refreshToken
  );
  const verificationDuration = performance.now() - verifyStart;

  const verificationChecks = buildVerificationChecks(
    writerOps,
    readerResult.toolResults
  );

  // Step 5: Build receipt and determine final status
  const receipt = await buildExecutionReceipt(
    cs,
    userId,
    writerResult.results,
    writerResult.totalDuration,
    verificationChecks,
    verificationDuration
  );

  const allSucceeded = writerResult.results.every(
    (r) => r.status === "success"
  );
  const finalStatus = allSucceeded ? "completed" : "partial_failure";

  const execution: ChangeSetExecution = {
    executedAt: new Date().toISOString(),
    results: writerResult.results,
    receipt,
  };

  return {
    changeSet: {
      ...cs,
      status: finalStatus,
      execution,
    },
  };
}
