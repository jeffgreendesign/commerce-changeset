import { describe, it, expect } from "vitest";
import { evaluatePolicy } from "@/lib/policy/engine";
import { RiskTier } from "@/lib/policy/types";
import type { PolicyFact } from "@/lib/policy/types";

describe("evaluatePolicy", () => {
  it("auto-approves read operations at Tier 0", async () => {
    const facts: PolicyFact = { operationType: "read" };
    const result = await evaluatePolicy(facts);

    expect(result.tier).toBe(RiskTier.READ);
    expect(result.decision).toBe("auto-approve");
    expect(result.ruleName).toBe("read-auto-approve");
  });

  it("auto-approves notify operations at Tier 1", async () => {
    const facts: PolicyFact = { operationType: "notify" };
    const result = await evaluatePolicy(facts);

    expect(result.tier).toBe(RiskTier.NOTIFY);
    expect(result.decision).toBe("auto-approve");
    expect(result.ruleName).toBe("notify-auto-approve");
  });

  it("requires CIBA for single-record write at Tier 2", async () => {
    const facts: PolicyFact = { operationType: "write", affectedRecords: 1 };
    const result = await evaluatePolicy(facts);

    expect(result.tier).toBe(RiskTier.WRITE);
    expect(result.decision).toBe("ciba-required");
    expect(result.ruleName).toBe("write-single-record");
  });

  it("escalates bulk write (>1 record) to Tier 3", async () => {
    const facts: PolicyFact = { operationType: "write", affectedRecords: 3 };
    const result = await evaluatePolicy(facts);

    expect(result.tier).toBe(RiskTier.BULK);
    expect(result.decision).toBe("ciba-escalated");
    expect(result.ruleName).toBe("write-bulk-records");
  });

  it("escalates large price change (>25%) to Tier 3", async () => {
    const facts: PolicyFact = {
      operationType: "write",
      affectedRecords: 1,
      priceChangePercent: 30,
    };
    const result = await evaluatePolicy(facts);

    expect(result.tier).toBe(RiskTier.BULK);
    expect(result.decision).toBe("ciba-escalated");
    expect(result.ruleName).toBe("write-large-price-change");
  });

  it("escalates stressed user write to Tier 3", async () => {
    const facts: PolicyFact = {
      operationType: "write",
      affectedRecords: 1,
      userStressLevel: 0.8,
    };
    const result = await evaluatePolicy(facts);

    expect(result.tier).toBe(RiskTier.BULK);
    expect(result.decision).toBe("ciba-escalated");
    expect(result.ruleName).toBe("stressed-user-write-escalation");
  });

  it("escalates fatigued session write to Tier 3", async () => {
    const facts: PolicyFact = {
      operationType: "write",
      affectedRecords: 1,
      sessionDurationMinutes: 90,
    };
    const result = await evaluatePolicy(facts);

    expect(result.tier).toBe(RiskTier.BULK);
    expect(result.decision).toBe("ciba-escalated");
    expect(result.ruleName).toBe("fatigued-session-write-escalation");
  });

  it("defaults to deny (Tier 3) for unknown action types", async () => {
    const facts = { operationType: "delete" } as unknown as PolicyFact;
    const result = await evaluatePolicy(facts);

    expect(result.tier).toBe(RiskTier.BULK);
    expect(result.decision).toBe("ciba-escalated");
    expect(result.ruleName).toBe("default-deny");
  });
});
