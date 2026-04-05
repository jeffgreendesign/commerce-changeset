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
import { runNotifierAgent, sendExecutionReceipt } from "@/lib/agents/notifier";
import { requestApproval } from "./approval";
import type {
  ChangeSet,
  ChangeSetExecution,
  ChangeSetStatus,
  ExecutorCallbacks,
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

export type { ExecutorCallbacks };

// ── Verification ─────────────────────────────────────────────────────

/** Extract the SKU prefix from an operation target (e.g. "STR-001" from "STR-001 Classic Runner"). */
function extractSku(target: string): string | undefined {
  return target.match(/^(STR-\d{3})/)?.[1];
}

/** Map action names to the header name in the Products sheet. */
const ACTION_FIELD_MAP: Record<string, string> = {
  update_price: "Promo Price",
  set_promo_status: "Promo Active",
  update_inventory_flag: "Inventory",
  bulk_price_change: "Promo Price",
};

/**
 * Build verification checks by comparing expected diff values against
 * actual product state from the Reader Agent's tool results.
 */
function buildVerificationChecks(
  writerOps: Operation[],
  readerToolResults: Array<{ toolName: string; result: unknown }>
): VerificationCheck[] {
  // Find product data from reader's tool results (LLM may call get_products or get_pricing).
  const productsResult = readerToolResults.find(
    (tr) => tr.toolName === "get_products" || tr.toolName === "get_pricing"
  );
  const rawResult = productsResult?.result as
    | { products?: Record<string, string>[]; pricing?: Record<string, string>[] }
    | undefined;
  const products = rawResult?.products ?? rawResult?.pricing;

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
    if (op.action === "bulk_price_change") {
      // Bulk ops encode SKU in each diff field: "Promo Price (STR-001)"
      for (const diff of op.diff) {
        const skuMatch = diff.field.match(/\((STR-\d{3})\)/);
        const product = skuMatch
          ? products.find((p) => p["SKU"] === skuMatch[1])
          : undefined;
        const actual = product?.["Promo Price"] ?? "not_found";
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
      continue;
    }

    if (op.action === "create_product") {
      // Verify the new product was appended by checking key fields
      const skuDiff = op.diff.find((d) => d.field === "SKU");
      const newSku = skuDiff ? String(skuDiff.after) : undefined;
      const product = newSku
        ? products.find((p) => p["SKU"] === newSku)
        : undefined;

      for (const diff of op.diff) {
        const actual = product?.[diff.field] ?? "not_found";
        const expectedStr = String(diff.after).trim().toUpperCase();
        const actualStr = String(actual).trim().toUpperCase();
        checks.push({
          operationId: op.id,
          field: diff.field,
          expected: diff.after,
          actual,
          status:
            expectedStr === "" && actualStr === ""
              ? "pass"
              : actualStr === expectedStr
                ? "pass"
                : "fail",
        });
      }
      continue;
    }

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
        toolsGranted: ["update_price", "set_promo_status", "update_inventory_flag", "bulk_price_change", "create_product"],
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

// ── Approval code → status mapping ───────────────────────────────────

function mapApprovalCodeToStatus(code: string): ChangeSetStatus {
  if (code === "expired") return "expired";
  if (code === "access_denied") return "denied";
  return "draft";
}

// ── Executor ─────────────────────────────────────────────────────────

export async function executeChangeSet(
  changeSet: ChangeSet,
  refreshToken: string,
  userId: string,
  userEmail?: string,
  callbacks?: ExecutorCallbacks
): Promise<ExecuteChangeSetResult> {
  if (changeSet.status !== "draft") {
    throw new Error(
      `Cannot execute change set in "${changeSet.status}" status. Expected "draft".`
    );
  }

  let cs: ChangeSet = { ...changeSet };

  const writerOps = cs.operations.filter((op) => op.agent === "writer");
  const needsCIBA = cs.riskSummary.requiresCIBA && writerOps.length > 0;

  // Step 1: Request CIBA approval (only when required)
  if (needsCIBA) {
    cs = { ...cs, status: "pending_approval" };
    callbacks?.onPhaseStart?.("approval", `Requesting CIBA approval for ${writerOps.length} operations`);
    callbacks?.onApprovalStatus?.("waiting");

    console.log(`[executor] Requesting CIBA approval for changeSet ${cs.id.slice(0, 8)}`);
    const approvalStart = performance.now();
    const approvalResult = await requestApproval(cs, userId);

    if (!approvalResult.success) {
      callbacks?.onApprovalStatus?.("denied");
      console.error(`[executor] CIBA approval failed: ${approvalResult.code} — ${approvalResult.message}`);
      return {
        changeSet: {
          ...cs,
          status: mapApprovalCodeToStatus(approvalResult.code),
        },
        error: {
          code: approvalResult.code,
          message: approvalResult.message,
        },
      };
    }

    // Step 2: Mark approved
    callbacks?.onApprovalStatus?.("approved");
    console.log(`[executor] CIBA approved in ${Math.round(performance.now() - approvalStart)}ms`);
    cs = {
      ...cs,
      status: "approved",
      approval: approvalResult.approval,
    };
  } else {
    console.log(`[executor] CIBA not required — skipping approval`);
    cs = { ...cs, status: "approved" };
  }

  // Step 3: Execute writer operations
  cs = { ...cs, status: "executing" };
  callbacks?.onPhaseStart?.("writing", `Executing ${writerOps.length} write operations`);
  const writerResult = await runWriterAgent(writerOps, refreshToken);

  // Stream individual operation results via callbacks
  for (const result of writerResult.results) {
    callbacks?.onOperationComplete?.(result);
  }

  const succeededOps = writerResult.results.filter((r) => r.status === "success").length;
  const failedOps = writerResult.results.filter((r) => r.status === "failure");
  console.log(`[executor] Writer completed — ${succeededOps}/${writerOps.length} succeeded in ${Math.round(writerResult.totalDuration)}ms`);
  if (failedOps.length > 0) {
    console.error(`[executor] Writer: ${failedOps.length}/${writerOps.length} operations failed`);
  }

  // Step 4: Verification read-back
  callbacks?.onPhaseStart?.("verification", "Reading back product data to verify changes");
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

  for (const check of verificationChecks) {
    callbacks?.onVerificationCheck?.(check);
    const sku = writerOps.find((op) => op.id === check.operationId)?.target ?? "unknown";
    console.log(`[executor] Check ${sku} ${check.field}: expected=${JSON.stringify(check.expected)}, actual=${JSON.stringify(check.actual)} → ${check.status}`);
  }
  const passedChecks = verificationChecks.filter((c) => c.status === "pass").length;
  const failedChecks = verificationChecks.filter((c) => c.status === "fail");
  console.log(`[executor] Verification: ${passedChecks}/${verificationChecks.length} checks passed`);
  if (failedChecks.length > 0) {
    console.error(`[executor] Verification: ${failedChecks.length}/${verificationChecks.length} checks failed`);
  }

  // Step 5: Build receipt and determine final status
  callbacks?.onPhaseStart?.("receipt", "Building execution receipt and audit hash");
  const receipt = await buildExecutionReceipt(
    cs,
    userId,
    writerResult.results,
    writerResult.totalDuration,
    verificationChecks,
    verificationDuration
  );

  // Step 6: Send notifications via Notifier Agent (non-blocking)
  callbacks?.onPhaseStart?.("notification", "Sending execution notification and receipt email");
  if (userEmail) {
    try {
      const [notifierResult, receiptResult] = await Promise.all([
        runNotifierAgent(cs, receipt, userEmail, refreshToken),
        sendExecutionReceipt(receipt, userEmail, refreshToken),
      ]);
      receipt.oboChain.delegatedTo.push("notifier");
      const notifierOps: string[] = [];
      if (notifierResult.success) {
        notifierOps.push(`sent notification: ${notifierResult.messageId ?? "unknown"}`);
      } else {
        notifierOps.push(`notification failed: ${notifierResult.error ?? "unknown"}`);
      }
      if (receiptResult.success) {
        notifierOps.push(`sent receipt: ${receiptResult.messageId ?? "unknown"}`);
      } else {
        notifierOps.push(`receipt failed: ${receiptResult.error ?? "unknown"}`);
      }
      receipt.agentDelegations.push({
        agent: "notifier",
        actingOnBehalfOf: userId,
        toolsGranted: ["send_launch_notification", "send_execution_receipt"],
        contextReceived: "execution summary and receipt",
        tokenExchangeId: `tv_exch_${crypto.randomUUID().slice(0, 8)}`,
        operationsPerformed: notifierOps,
        duration: Math.max(notifierResult.duration, receiptResult.duration),
      });
      // Recompute audit hash with notifier delegation included
      receipt.auditHash = "";
      receipt.auditHash = await computeAuditHash(JSON.stringify(receipt));
    } catch (err) {
      console.error("Notifier agent failed:", err);
    }
  }

  const allSucceeded = writerResult.results.every(
    (r) => r.status === "success"
  );
  const finalStatus = allSucceeded ? "completed" : "partial_failure";
  console.log(`[executor] ChangeSet ${cs.id.slice(0, 8)} final status: ${finalStatus}`);

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
