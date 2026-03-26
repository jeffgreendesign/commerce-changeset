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
  // ── Voice/session context (populated by Gemini Live integration) ────
  /** 0-1 stress level from Gemini affective dialog. */
  userStressLevel?: number;
  /** Duration of the current voice session in minutes. */
  sessionDurationMinutes?: number;
}

/** The result of evaluating a set of facts against the policy rules. */
export interface PolicyDecision {
  decision: "auto-approve" | "ciba-required" | "ciba-escalated";
  tier: RiskTier;
  reason: string;
  ruleName: string;
  scopeRequested: string;
}
