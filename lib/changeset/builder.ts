/**
 * Change Set builder — assembles a complete ChangeSet from parsed operations.
 *
 * For each operation: evaluates policy, computes rollback instructions,
 * and produces a risk summary. Returns a draft ChangeSet ready for review.
 */

import { evaluatePolicy } from "@/lib/policy/engine";
import { RiskTier } from "@/lib/policy/types";
import type { PolicyFact } from "@/lib/policy/types";
import { runProactiveChecks } from "@/lib/voice/proactive-insights";
import type { VoiceUserContext } from "@/lib/voice/types";
import type {
  ChangeSet,
  Operation,
  OperationDiff,
  RiskSummary,
  RollbackInstruction,
} from "./types";

// ── Input types ─────────────────────────────────────────────────────

/** A single operation parsed from the user's request by the LLM. */
export interface ParsedOperation {
  agent: "reader" | "writer" | "notifier";
  action: string;
  target: string;
  diff: OperationDiff[];
  operationType: PolicyFact["operationType"];
  affectedRecords?: number;
  priceChangePercent?: number;
}

export interface BuildChangeSetInput {
  requestedBy: string;
  originalPrompt: string;
  operations: ParsedOperation[];
  /** Voice-derived user context for stress-aware policy evaluation. */
  voiceContext?: VoiceUserContext;
  /** Current product data from reader agent, for proactive checks. */
  productData?: Record<string, string>[];
  /** Duration of the current voice session in minutes (for fatigue detection). */
  sessionDurationMinutes?: number;
}

// ── Rollback generation ─────────────────────────────────────────────

function generateRollback(op: ParsedOperation): RollbackInstruction {
  const firstDiff = op.diff[0];

  switch (op.action) {
    case "update_price":
      return {
        action: "update_price",
        params: {
          target: op.target,
          price: firstDiff?.before ?? 0,
        },
      };
    case "set_promo_status":
      return {
        action: "set_promo_status",
        params: {
          target: op.target,
          status: firstDiff?.before ?? false,
        },
      };
    case "update_inventory_flag":
      return {
        action: "update_inventory_flag",
        params: {
          target: op.target,
          inventory: firstDiff?.before ?? "",
        },
      };
    case "bulk_price_change":
      return {
        action: "bulk_price_change",
        params: {
          target: op.target,
          prices: Object.fromEntries(
            op.diff.map((d) => [d.field, d.before])
          ),
        },
      };
    case "create_product":
      return {
        action: "manual_review",
        params: {
          note: "Remove the created row from the Products sheet. Automatic deletion requires manual review.",
          target: op.target,
          sku: op.diff.find((d) => d.field === "SKU")?.after ?? "unknown",
        },
      };
    default:
      return {
        action: "manual_review",
        params: {
          note: `Automatic rollback not available for "${op.action}". Manual review required.`,
          target: op.target,
          originalValues: Object.fromEntries(
            op.diff.map((d) => [d.field, d.before])
          ),
        },
      };
  }
}

// ── Risk summary computation ────────────────────────────────────────

function computeRiskSummary(operations: Operation[]): RiskSummary {
  const operationsByTier: Record<number, number> = {};
  let maxTier: number = RiskTier.READ;
  let autonomousOps = 0;
  let approvalRequiredOps = 0;

  for (const op of operations) {
    operationsByTier[op.tier] = (operationsByTier[op.tier] ?? 0) + 1;
    if (op.tier > maxTier) {
      maxTier = op.tier;
    }
    if (op.policyExplanation.decision === "auto-approve") {
      autonomousOps++;
    } else {
      approvalRequiredOps++;
    }
  }

  return {
    maxTier: maxTier as RiskTier,
    operationsByTier,
    requiresCIBA: maxTier >= RiskTier.WRITE,
    autonomousOps,
    approvalRequiredOps,
  };
}

// ── Builder ─────────────────────────────────────────────────────────

/**
 * Build a complete ChangeSet from parsed operations.
 *
 * Each operation is evaluated against the policy engine and assigned a
 * risk tier, policy explanation, and rollback instruction. The resulting
 * ChangeSet is returned in `draft` status.
 */
export async function buildChangeSet(
  input: BuildChangeSetInput
): Promise<ChangeSet> {
  // Filter out no-op operations where before === after for every diff entry.
  const actionable = input.operations.filter((parsed) => {
    const isNoOp = parsed.diff.every(
      (d) =>
        String(d.before).trim().toLowerCase() ===
        String(d.after).trim().toLowerCase()
    );
    if (isNoOp) {
      console.log(
        `[builder] Skipping no-op: ${parsed.action} on ${parsed.target} (before === after)`
      );
    }
    return !isNoOp;
  });

  const operations: Operation[] = await Promise.all(
    actionable.map(async (parsed) => {
      const fact: PolicyFact = {
        operationType: parsed.operationType,
        affectedRecords: parsed.affectedRecords ?? 1,
        priceChangePercent: parsed.priceChangePercent,
        // Pass voice context signals into policy evaluation
        userStressLevel: input.voiceContext?.voiceMetrics.stressLevel,
        sessionDurationMinutes: input.sessionDurationMinutes,
      };

      const policyExplanation = await evaluatePolicy(fact);

      const op = {
        id: crypto.randomUUID(),
        agent: parsed.agent,
        action: parsed.action,
        target: parsed.target,
        tier: policyExplanation.tier,
        policyExplanation,
        diff: parsed.diff,
        rollback: generateRollback(parsed),
      };
      console.log(`[builder] Op ${op.action} on ${op.target} → tier ${op.tier}, policy: ${policyExplanation.ruleName}`);
      return op;
    })
  );

  // Run proactive checks if product data is available
  const proactiveIssues = input.productData
    ? runProactiveChecks(actionable, input.productData)
    : [];

  if (proactiveIssues.length > 0) {
    console.log(`[builder] Proactive checks found ${proactiveIssues.length} issue(s): ${proactiveIssues.map((i) => `${i.severity}: ${i.description.slice(0, 60)}`).join("; ")}`);
  }

  return {
    id: crypto.randomUUID(),
    requestedBy: input.requestedBy,
    originalPrompt: input.originalPrompt,
    createdAt: new Date().toISOString(),
    status: "draft",
    operations,
    riskSummary: computeRiskSummary(operations),
    voiceContext: input.voiceContext,
    proactiveIssues: proactiveIssues.length > 0 ? proactiveIssues : undefined,
  };
}
