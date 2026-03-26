/**
 * Policy engine — json-rules-engine configuration for risk tier evaluation.
 *
 * Evaluates operation facts against five rules and returns a typed decision
 * indicating whether the operation is auto-approved or requires CIBA consent.
 */

import { Engine } from "json-rules-engine";

import { RiskTier } from "./types";
import type { PolicyDecision, PolicyFact } from "./types";

// ── Policy thresholds ────────────────────────────────────────────────
/** Stress level above which write operations are escalated to Tier 3. */
const STRESS_ESCALATION_THRESHOLD = 0.7;
/** Session duration (minutes) above which write operations are escalated. */
const SESSION_FATIGUE_THRESHOLD_MINUTES = 60;

// Event params shape we attach to every rule. json-rules-engine types
// Event.params as Record<string, any>, so we define our own narrow type
// and cast at the extraction boundary.
interface RuleEventParams {
  tier: RiskTier;
  reason: string;
  ruleName: string;
}

const engine = new Engine([], {
  allowUndefinedConditions: true,
  // allowUndefinedFacts exists at runtime but is missing from the type defs.
  ...({ allowUndefinedFacts: true } as Record<string, boolean>),
});

// ── Rule 1: read → auto-approve (Tier 0) ────────────────────────────
engine.addRule({
  name: "read-auto-approve",
  priority: 10,
  conditions: {
    all: [{ fact: "operationType", operator: "equal", value: "read" }],
  },
  event: {
    type: "auto-approve",
    params: {
      tier: RiskTier.READ,
      reason: "Read operations are always allowed",
      ruleName: "read-auto-approve",
    } satisfies RuleEventParams,
  },
});

// ── Rule 2: notify → auto-approve (Tier 1) ──────────────────────────
engine.addRule({
  name: "notify-auto-approve",
  priority: 10,
  conditions: {
    all: [{ fact: "operationType", operator: "equal", value: "notify" }],
  },
  event: {
    type: "auto-approve",
    params: {
      tier: RiskTier.NOTIFY,
      reason: "Notification operations are allowed",
      ruleName: "notify-auto-approve",
    } satisfies RuleEventParams,
  },
});

// ── Rule 3: write + ≤1 record → ciba-required (Tier 2) ──────────────
engine.addRule({
  name: "write-single-record",
  priority: 5,
  conditions: {
    all: [
      { fact: "operationType", operator: "equal", value: "write" },
      { fact: "affectedRecords", operator: "lessThanInclusive", value: 1 },
    ],
  },
  event: {
    type: "ciba-required",
    params: {
      tier: RiskTier.WRITE,
      reason: "Single-record write requires approval",
      ruleName: "write-single-record",
    } satisfies RuleEventParams,
  },
});

// ── Rule 4: write + >1 record → ciba-escalated (Tier 3) ─────────────
engine.addRule({
  name: "write-bulk-records",
  priority: 8,
  conditions: {
    all: [
      { fact: "operationType", operator: "equal", value: "write" },
      { fact: "affectedRecords", operator: "greaterThan", value: 1 },
    ],
  },
  event: {
    type: "ciba-escalated",
    params: {
      tier: RiskTier.BULK,
      reason: "Bulk write requires escalated approval",
      ruleName: "write-bulk-records",
    } satisfies RuleEventParams,
  },
});

// ── Rule 5: write + >25% price change → ciba-escalated (Tier 3) ─────
engine.addRule({
  name: "write-large-price-change",
  priority: 9,
  conditions: {
    all: [
      { fact: "operationType", operator: "equal", value: "write" },
      { fact: "priceChangePercent", operator: "greaterThan", value: 25 },
    ],
  },
  event: {
    type: "ciba-escalated",
    params: {
      tier: RiskTier.BULK,
      reason: "Price change exceeds 25% threshold",
      ruleName: "write-large-price-change",
    } satisfies RuleEventParams,
  },
});

// ── Rule 6: stressed user + write → ciba-escalated (Tier 3) ──────────
engine.addRule({
  name: "stressed-user-write-escalation",
  priority: 11, // Higher than write-single-record to override
  conditions: {
    all: [
      { fact: "operationType", operator: "equal", value: "write" },
      { fact: "userStressLevel", operator: "greaterThan", value: STRESS_ESCALATION_THRESHOLD },
    ],
  },
  event: {
    type: "ciba-escalated",
    params: {
      tier: RiskTier.BULK,
      reason: "User stress level elevated — escalating for additional confirmation",
      ruleName: "stressed-user-write-escalation",
    } satisfies RuleEventParams,
  },
});

// ── Rule 7: long session + write → ciba-escalated (Tier 3) ───────────
engine.addRule({
  name: "fatigued-session-write-escalation",
  priority: 11,
  conditions: {
    all: [
      { fact: "operationType", operator: "equal", value: "write" },
      { fact: "sessionDurationMinutes", operator: "greaterThan", value: SESSION_FATIGUE_THRESHOLD_MINUTES },
    ],
  },
  event: {
    type: "ciba-escalated",
    params: {
      tier: RiskTier.BULK,
      reason: "Extended session detected — escalating to prevent fatigue-related errors",
      ruleName: "fatigued-session-write-escalation",
    } satisfies RuleEventParams,
  },
});

/**
 * Evaluate an operation against the policy rules.
 *
 * Returns the most restrictive matching decision (highest tier).
 * If no rules match, defaults to ciba-escalated as a safe fallback.
 */
export async function evaluatePolicy(
  facts: PolicyFact
): Promise<PolicyDecision> {
  const { events } = await engine.run(
    facts as unknown as Record<string, never>
  );

  if (events.length === 0) {
    return {
      decision: "ciba-escalated",
      tier: RiskTier.BULK,
      reason: "No matching policy rule — defaulting to highest restriction",
      ruleName: "default-deny",
      scopeRequested: facts.operationType,
    };
  }

  // Pick the event with the highest tier (most restrictive).
  const highest = events.reduce((max, ev) => {
    const maxTier = (max.params as RuleEventParams | undefined)?.tier ?? 0;
    const evTier = (ev.params as RuleEventParams | undefined)?.tier ?? 0;
    return evTier > maxTier ? ev : max;
  });

  const params = highest.params as RuleEventParams;

  return {
    decision: highest.type as PolicyDecision["decision"],
    tier: params.tier,
    reason: params.reason,
    ruleName: params.ruleName,
    scopeRequested: facts.operationType,
  };
}
