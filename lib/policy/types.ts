/**
 * Policy engine types — risk tiers, facts, and decisions.
 */

export const RiskTier = {
  READ: 0,
  NOTIFY: 1,
  WRITE: 2,
  BULK: 3,
} as const;

export type RiskTier = (typeof RiskTier)[keyof typeof RiskTier];

/** Facts fed into the policy engine for rule evaluation. */
export interface PolicyFact {
  operationType: "read" | "notify" | "write";
  affectedRecords?: number;
  priceChangePercent?: number;
  domain?: string;
}

/** The result of evaluating a set of facts against the policy rules. */
export interface PolicyDecision {
  decision: "auto-approve" | "ciba-required" | "ciba-escalated";
  tier: RiskTier;
  reason: string;
  ruleName: string;
  scopeRequested: string;
}
