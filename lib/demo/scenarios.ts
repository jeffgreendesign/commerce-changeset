/**
 * Demo scenarios — pre-built changeset data for each demo flow.
 *
 * Each scenario contains the full lifecycle: draft changeset, execution
 * results, and receipt. The classifier picks the best match for user input.
 */

import { RiskTier } from "@/lib/policy/types";
import type { PolicyDecision } from "@/lib/policy/types";
import type {
  ChangeSet,
  ChangeSetExecution,
  OperationResult,
  VerificationCheck,
  ExecutionReceipt,
  AgentDelegation,
} from "@/lib/changeset/types";
import type { ProactiveIssue } from "@/lib/voice/types";

// ── Scenario interface ──────────────────────────────────────────────

export interface DemoScenario {
  id: string;
  name: string;
  keywords: string[];
  changeSet: ChangeSet;
  reasoning: string;
  readerText: string;
  executionResult: ChangeSetExecution;
}

// ── Helpers ─────────────────────────────────────────────────────────

function makeId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

function makeReceipt(
  changeSetId: string,
  ops: { id: string; action: string }[],
  checks: VerificationCheck[]
): ExecutionReceipt {
  const writerDelegation: AgentDelegation = {
    agent: "writer",
    actingOnBehalfOf: "auth0|demo-user-001",
    toolsGranted: ["update_price", "set_promo_status", "update_inventory_flag", "bulk_price_change"],
    contextReceived: "approved change set operations only",
    tokenExchangeId: `tv_exch_${crypto.randomUUID().slice(0, 8)}`,
    operationsPerformed: ops.map((o) => o.action),
    duration: 1200 + Math.floor(Math.random() * 800),
  };
  const readerDelegation: AgentDelegation = {
    agent: "reader",
    actingOnBehalfOf: "auth0|demo-user-001",
    toolsGranted: ["get_products", "get_pricing"],
    contextReceived: "post-execution verification",
    tokenExchangeId: `tv_exch_${crypto.randomUUID().slice(0, 8)}`,
    operationsPerformed: ["get_products"],
    duration: 600 + Math.floor(Math.random() * 400),
  };
  const notifierDelegation: AgentDelegation = {
    agent: "notifier",
    actingOnBehalfOf: "auth0|demo-user-001",
    toolsGranted: ["send_launch_notification"],
    contextReceived: "execution receipt",
    tokenExchangeId: `tv_exch_${crypto.randomUUID().slice(0, 8)}`,
    operationsPerformed: ["send_launch_notification"],
    duration: 400 + Math.floor(Math.random() * 200),
  };

  const receipt: ExecutionReceipt = {
    changeSetId,
    executedBy: "demo@stride-athletics.com",
    executedAt: now(),
    oboChain: {
      user: "auth0|demo-user-001",
      delegatedTo: ["writer", "reader", "notifier"],
    },
    agentDelegations: [writerDelegation, readerDelegation, notifierDelegation],
    verification: {
      checksRun: checks.length,
      checksPassed: checks.filter((c) => c.status === "pass").length,
      results: checks,
    },
    rollbackInstructions:
      "To reverse: re-run each operation with before/after values swapped.",
    auditHash: `sha256:${crypto.randomUUID().replace(/-/g, "")}`,
  };
  return receipt;
}

// ── Scenario 1: Single price discount ───────────────────────────────

function buildScenario1(): DemoScenario {
  const csId = makeId();
  const op1Id = makeId();
  const op2Id = makeId();

  const policyWrite: PolicyDecision = {
    decision: "ciba-required",
    tier: RiskTier.WRITE,
    reason: "Single-record write requires step-up approval",
    ruleName: "write-single-record",
    scopeRequested: "commerce:write",
  };

  const changeSet: ChangeSet = {
    id: csId,
    requestedBy: "auth0|demo-user-001",
    originalPrompt: "Apply 20% discount to Classic Runner",
    createdAt: now(),
    status: "draft",
    operations: [
      {
        id: op1Id,
        agent: "writer",
        action: "set_promo_status",
        target: "STR-001 Classic Runner",
        tier: RiskTier.WRITE,
        policyExplanation: policyWrite,
        diff: [{ field: "Promo Active", before: "FALSE", after: "TRUE" }],
        rollback: {
          action: "set_promo_status",
          params: { sku: "STR-001", value: "FALSE" },
        },
      },
      {
        id: op2Id,
        agent: "writer",
        action: "update_price",
        target: "STR-001 Classic Runner",
        tier: RiskTier.WRITE,
        policyExplanation: policyWrite,
        diff: [{ field: "Promo Price", before: "", after: 103.99 }],
        rollback: {
          action: "update_price",
          params: { sku: "STR-001", field: "Promo Price", value: "" },
        },
      },
    ],
    riskSummary: {
      maxTier: RiskTier.WRITE,
      operationsByTier: { 0: 0, 1: 0, 2: 2, 3: 0 },
      requiresCIBA: true,
      autonomousOps: 0,
      approvalRequiredOps: 2,
    },
  };

  const checks: VerificationCheck[] = [
    { operationId: op1Id, field: "Promo Active", expected: "TRUE", actual: "TRUE", status: "pass" },
    { operationId: op2Id, field: "Promo Price", expected: 103.99, actual: 103.99, status: "pass" },
  ];

  const results: OperationResult[] = [
    { operationId: op1Id, status: "success", duration: 450 },
    { operationId: op2Id, status: "success", duration: 380 },
  ];

  return {
    id: "scenario-1",
    name: "Single product discount",
    keywords: ["discount", "classic runner", "str-001", "20%", "promo", "single"],
    changeSet,
    reasoning:
      "Applying a 20% discount to Classic Runner (STR-001) requires two operations: toggle promo status to active, then set the promo price to $103.99 (20% off $129.99).",
    readerText:
      "Classic Runner (STR-001) is currently priced at $129.99 with no active promotion. Inventory: in stock.",
    executionResult: {
      executedAt: now(),
      results,
      receipt: makeReceipt(csId, [{ id: op1Id, action: "set_promo_status" }, { id: op2Id, action: "update_price" }], checks),
    },
  };
}

// ── Scenario 2: Bulk price change ───────────────────────────────────

function buildScenario2(): DemoScenario {
  const csId = makeId();
  const runningSkus = [
    { sku: "STR-001", name: "Classic Runner", base: 129.99, promo: 110.49 },
    { sku: "STR-002", name: "Trail Blazer", base: 149.99, promo: 127.49 },
    { sku: "STR-003", name: "Speed Elite", base: 179.99, promo: 152.99 },
    { sku: "STR-006", name: "Marathon Pro", base: 199.99, promo: 169.99 },
  ];

  const policyBulk: PolicyDecision = {
    decision: "ciba-escalated",
    tier: RiskTier.BULK,
    reason: "Bulk write affecting 4+ records requires escalated approval",
    ruleName: "write-bulk-records",
    scopeRequested: "commerce:bulk-write",
  };

  const statusOps = runningSkus.map((s) => ({
    id: makeId(),
    agent: "writer" as const,
    action: "set_promo_status",
    target: `${s.sku} ${s.name}`,
    tier: RiskTier.BULK,
    policyExplanation: policyBulk,
    diff: [{ field: "Promo Active", before: "FALSE" as string, after: "TRUE" as string }],
    rollback: {
      action: "set_promo_status",
      params: { sku: s.sku, value: "FALSE" },
    },
  }));

  const priceOp = {
    id: makeId(),
    agent: "writer" as const,
    action: "bulk_price_change",
    target: `${runningSkus.map((s) => s.sku).join(", ")} (Running category)`,
    tier: RiskTier.BULK,
    policyExplanation: policyBulk,
    diff: runningSkus.map((s) => ({
      field: `${s.sku} Promo Price`,
      before: "" as string | number,
      after: s.promo,
    })),
    rollback: {
      action: "bulk_price_change",
      params: {
        skus: runningSkus.map((s) => s.sku),
        field: "Promo Price",
        values: runningSkus.map(() => ""),
      },
    },
  };

  const allOps = [...statusOps, priceOp];

  const changeSet: ChangeSet = {
    id: csId,
    requestedBy: "auth0|demo-user-001",
    originalPrompt: "Reduce all running shoes by 15%",
    createdAt: now(),
    status: "draft",
    operations: allOps,
    riskSummary: {
      maxTier: RiskTier.BULK,
      operationsByTier: { 0: 0, 1: 0, 2: 0, 3: allOps.length },
      requiresCIBA: true,
      autonomousOps: 0,
      approvalRequiredOps: allOps.length,
    },
    repetitionSignal: {
      isRepetitive: true,
      patternDescription:
        "4 set_promo_status operations detected — all toggling promo to active for Running category SKUs.",
      suggestedBulkAction: "bulk_price_change",
      affectedTargets: runningSkus.map((s) => s.sku),
      confirmationTable: runningSkus.map((s) => ({
        sku: s.sku,
        productName: s.name,
        currentPrice: s.base,
        proposedPrice: s.promo,
        field: "Promo Price",
      })),
    },
  };

  const checks: VerificationCheck[] = runningSkus.flatMap((s) => [
    {
      operationId: statusOps.find((o) => o.target.startsWith(s.sku))!.id,
      field: "Promo Active",
      expected: "TRUE" as string | number | boolean,
      actual: "TRUE" as string | number | boolean,
      status: "pass" as const,
    },
    {
      operationId: priceOp.id,
      field: `${s.sku} Promo Price`,
      expected: s.promo as string | number | boolean,
      actual: s.promo as string | number | boolean,
      status: "pass" as const,
    },
  ]);

  const results: OperationResult[] = allOps.map((op) => ({
    operationId: op.id,
    status: "success" as const,
    duration: 300 + Math.floor(Math.random() * 400),
  }));

  return {
    id: "scenario-2",
    name: "Bulk price change",
    keywords: ["bulk", "all running", "reduce all", "15% off", "running shoes", "every", "all shoes"],
    changeSet,
    reasoning:
      "Applying 15% discount across all Running category products (STR-001, STR-002, STR-003, STR-006). Each SKU needs promo status toggled plus a bulk price update.",
    readerText:
      "Found 4 products in the Running category: Classic Runner ($129.99), Trail Blazer ($149.99), Speed Elite ($179.99), Marathon Pro ($199.99). None currently have active promotions.",
    executionResult: {
      executedAt: now(),
      results,
      receipt: makeReceipt(
        csId,
        allOps.map((o) => ({ id: o.id, action: o.action })),
        checks
      ),
    },
  };
}

// ── Scenario 3: Read-only query ─────────────────────────────────────

function buildScenario3(): DemoScenario {
  const csId = makeId();

  const policyRead: PolicyDecision = {
    decision: "auto-approve",
    tier: RiskTier.READ,
    reason: "Read operation — auto-approved",
    ruleName: "read-auto-approve",
    scopeRequested: "commerce:read",
  };

  const changeSet: ChangeSet = {
    id: csId,
    requestedBy: "auth0|demo-user-001",
    originalPrompt: "What's the current price of STR-001?",
    createdAt: now(),
    status: "draft",
    operations: [
      {
        id: makeId(),
        agent: "reader",
        action: "get_pricing",
        target: "STR-001 Classic Runner",
        tier: RiskTier.READ,
        policyExplanation: policyRead,
        diff: [],
        rollback: { action: "none", params: {} },
      },
    ],
    riskSummary: {
      maxTier: RiskTier.READ,
      operationsByTier: { 0: 1, 1: 0, 2: 0, 3: 0 },
      requiresCIBA: false,
      autonomousOps: 1,
      approvalRequiredOps: 0,
    },
  };

  return {
    id: "scenario-3",
    name: "Read-only query",
    keywords: ["what", "show", "price of", "current", "inventory", "how much", "list", "tell me"],
    changeSet,
    reasoning:
      "This is a read-only query. No writes needed — returning current product data.",
    readerText:
      "Classic Runner (STR-001): Base Price $129.99, no active promo, in stock.",
    executionResult: {
      executedAt: now(),
      results: [],
      receipt: {
        changeSetId: csId,
        executedBy: "demo@stride-athletics.com",
        executedAt: now(),
        oboChain: { user: "auth0|demo-user-001", delegatedTo: ["reader"] },
        agentDelegations: [
          {
            agent: "reader",
            actingOnBehalfOf: "auth0|demo-user-001",
            toolsGranted: ["get_products", "get_pricing"],
            contextReceived: "read-only product query",
            tokenExchangeId: `tv_exch_${crypto.randomUUID().slice(0, 8)}`,
            operationsPerformed: ["get_pricing"],
            duration: 450,
          },
        ],
        verification: { checksRun: 0, checksPassed: 0, results: [] },
        rollbackInstructions: "No writes performed — nothing to roll back.",
        auditHash: `sha256:${crypto.randomUUID().replace(/-/g, "")}`,
      },
    },
  };
}

// ── Scenario 4: Rollback ────────────────────────────────────────────

function buildScenario4(): DemoScenario {
  // Build a "completed" changeset that will be the target of rollback
  const scenario1 = buildScenario1();
  const completedCs: ChangeSet = {
    ...scenario1.changeSet,
    status: "completed",
    execution: scenario1.executionResult,
    approval: {
      approvedBy: "auth0|demo-user-001",
      approvedAt: now(),
      cibaTransactionId: `ciba_${crypto.randomUUID().slice(0, 8)}`,
      scopesGranted: ["openid", "commerce:write"],
      authorizationDetails: [
        {
          type: "commerce_changeset",
          operations: scenario1.changeSet.operations.map((op) => ({
            action: op.action,
            target: op.target,
            diff: op.diff,
            tier: op.tier,
          })),
        },
      ],
    },
  };

  // Build the rollback changeset (inverted diffs)
  const rollbackId = makeId();
  const rollbackOp1Id = makeId();
  const rollbackOp2Id = makeId();

  const policyWrite: PolicyDecision = {
    decision: "ciba-required",
    tier: RiskTier.WRITE,
    reason: "Rollback write requires step-up approval",
    ruleName: "write-single-record",
    scopeRequested: "commerce:write",
  };

  const rollbackCs: ChangeSet = {
    id: rollbackId,
    requestedBy: "auth0|demo-user-001",
    originalPrompt: `Rollback of changeset ${completedCs.id.slice(0, 8)}`,
    createdAt: now(),
    status: "draft",
    rollbackOf: completedCs.id,
    operations: [
      {
        id: rollbackOp1Id,
        agent: "writer",
        action: "set_promo_status",
        target: "STR-001 Classic Runner",
        tier: RiskTier.WRITE,
        policyExplanation: policyWrite,
        diff: [{ field: "Promo Active", before: "TRUE", after: "FALSE" }],
        rollback: {
          action: "set_promo_status",
          params: { sku: "STR-001", value: "TRUE" },
        },
      },
      {
        id: rollbackOp2Id,
        agent: "writer",
        action: "update_price",
        target: "STR-001 Classic Runner",
        tier: RiskTier.WRITE,
        policyExplanation: policyWrite,
        diff: [{ field: "Promo Price", before: 103.99, after: "" }],
        rollback: {
          action: "update_price",
          params: { sku: "STR-001", field: "Promo Price", value: 103.99 },
        },
      },
    ],
    riskSummary: {
      maxTier: RiskTier.WRITE,
      operationsByTier: { 0: 0, 1: 0, 2: 2, 3: 0 },
      requiresCIBA: true,
      autonomousOps: 0,
      approvalRequiredOps: 2,
    },
  };

  const checks: VerificationCheck[] = [
    { operationId: rollbackOp1Id, field: "Promo Active", expected: "FALSE", actual: "FALSE", status: "pass" },
    { operationId: rollbackOp2Id, field: "Promo Price", expected: "", actual: "", status: "pass" },
  ];

  return {
    id: "scenario-4",
    name: "Rollback",
    keywords: ["roll back", "rollback", "undo", "reverse", "revert"],
    changeSet: rollbackCs,
    reasoning:
      "Building reversal changeset — inverting the promo status toggle and price update from the original changeset.",
    readerText:
      "Classic Runner (STR-001): Promo Active TRUE, Promo Price $103.99. Rolling back to no promotion.",
    executionResult: {
      executedAt: now(),
      results: [
        { operationId: rollbackOp1Id, status: "success", duration: 420 },
        { operationId: rollbackOp2Id, status: "success", duration: 350 },
      ],
      receipt: makeReceipt(
        rollbackId,
        [
          { id: rollbackOp1Id, action: "set_promo_status" },
          { id: rollbackOp2Id, action: "update_price" },
        ],
        checks
      ),
    },
  };
}

// ── Scenario 5: Inventory management ───────────────────────────────

function buildScenario5(): DemoScenario {
  const csId = makeId();
  const op1Id = makeId();

  const policyWrite: PolicyDecision = {
    decision: "ciba-required",
    tier: RiskTier.WRITE,
    reason: "Single-record write requires step-up approval",
    ruleName: "write-single-record",
    scopeRequested: "commerce:write",
  };

  const changeSet: ChangeSet = {
    id: csId,
    requestedBy: "auth0|demo-user-001",
    originalPrompt: "Restock Trail Blazer and mark it as in stock",
    createdAt: now(),
    status: "draft",
    operations: [
      {
        id: op1Id,
        agent: "writer",
        action: "update_inventory_flag",
        target: "STR-002 Trail Blazer",
        tier: RiskTier.WRITE,
        policyExplanation: policyWrite,
        diff: [{ field: "Inventory", before: "out_of_stock", after: "in_stock" }],
        rollback: {
          action: "update_inventory_flag",
          params: { sku: "STR-002", value: "out_of_stock" },
        },
      },
    ],
    riskSummary: {
      maxTier: RiskTier.WRITE,
      operationsByTier: { 0: 0, 1: 0, 2: 1, 3: 0 },
      requiresCIBA: true,
      autonomousOps: 0,
      approvalRequiredOps: 1,
    },
  };

  const checks: VerificationCheck[] = [
    { operationId: op1Id, field: "Inventory", expected: "in_stock", actual: "in_stock", status: "pass" },
  ];

  const results: OperationResult[] = [
    { operationId: op1Id, status: "success", duration: 410 },
  ];

  return {
    id: "scenario-5",
    name: "Inventory management",
    keywords: ["inventory", "stock", "restock", "out of stock", "pre_order", "mark as", "trail blazer", "str-002"],
    changeSet,
    reasoning:
      "Trail Blazer (STR-002) is currently out of stock. Updating inventory status to in_stock to reflect restocked inventory.",
    readerText:
      "Trail Blazer (STR-002): Base Price $149.99, no active promo, currently out of stock.",
    executionResult: {
      executedAt: now(),
      results,
      receipt: makeReceipt(csId, [{ id: op1Id, action: "update_inventory_flag" }], checks),
    },
  };
}

// ── Scenario 6: Deep discount with proactive warnings ──────────────

function buildScenario6(): DemoScenario {
  const csId = makeId();
  const op1Id = makeId();
  const op2Id = makeId();

  const policyBulk: PolicyDecision = {
    decision: "ciba-escalated",
    tier: RiskTier.BULK,
    reason: "Price change exceeds 25% threshold — escalated to BULK tier",
    ruleName: "write-large-price-change",
    scopeRequested: "commerce:write",
  };

  const proactiveIssues: ProactiveIssue[] = [
    {
      severity: "error",
      operationId: "STR-013 Velocity Racer",
      description:
        "STR-013 promo price ($22.00) leaves only 10.0% margin — below the 15% floor. Minimum safe price: $33.00",
      suggestedFix: {
        action: "update_price",
        target: "STR-013 Velocity Racer",
        field: "Promo Price",
        currentValue: 22.0,
        suggestedValue: 33.0,
      },
    },
    {
      severity: "warning",
      operationId: "STR-013 Velocity Racer",
      description:
        "STR-013 has a 90% discount — unusually large. Verify this is intentional.",
    },
  ];

  const changeSet: ChangeSet = {
    id: csId,
    requestedBy: "auth0|demo-user-001",
    originalPrompt: "Apply 90% clearance discount to Velocity Racer",
    createdAt: now(),
    status: "draft",
    operations: [
      {
        id: op1Id,
        agent: "writer",
        action: "set_promo_status",
        target: "STR-013 Velocity Racer",
        tier: RiskTier.BULK,
        policyExplanation: policyBulk,
        diff: [{ field: "Promo Active", before: "FALSE", after: "TRUE" }],
        rollback: {
          action: "set_promo_status",
          params: { sku: "STR-013", value: "FALSE" },
        },
      },
      {
        id: op2Id,
        agent: "writer",
        action: "update_price",
        target: "STR-013 Velocity Racer",
        tier: RiskTier.BULK,
        policyExplanation: policyBulk,
        diff: [{ field: "Promo Price", before: "", after: 22.0 }],
        rollback: {
          action: "update_price",
          params: { sku: "STR-013", field: "Promo Price", value: "" },
        },
      },
    ],
    riskSummary: {
      maxTier: RiskTier.BULK,
      operationsByTier: { 0: 0, 1: 0, 2: 0, 3: 2 },
      requiresCIBA: true,
      autonomousOps: 0,
      approvalRequiredOps: 2,
    },
    proactiveIssues,
  };

  const checks: VerificationCheck[] = [
    { operationId: op1Id, field: "Promo Active", expected: "TRUE", actual: "TRUE", status: "pass" },
    { operationId: op2Id, field: "Promo Price", expected: 22.0, actual: 22.0, status: "pass" },
  ];

  const results: OperationResult[] = [
    { operationId: op1Id, status: "success", duration: 440 },
    { operationId: op2Id, status: "success", duration: 390 },
  ];

  return {
    id: "scenario-6",
    name: "Deep discount with proactive warnings",
    keywords: ["clearance", "steep discount", "90%", "velocity", "str-013", "aggressive", "velocity racer"],
    changeSet,
    reasoning:
      "Applying 90% clearance to Velocity Racer (STR-013) sets promo price to $22.00 on a $219.99 base. This breaches the 15% margin floor and triggers a large-discount warning. The policy escalates to BULK tier due to the >25% price change.",
    readerText:
      "Velocity Racer (STR-013): Base Price $219.99, no active promo. Inventory: 60 units.",
    executionResult: {
      executedAt: now(),
      results,
      receipt: makeReceipt(csId, [{ id: op1Id, action: "set_promo_status" }, { id: op2Id, action: "update_price" }], checks),
    },
  };
}

// ── Scenario 7: Launch scheduling ──────────────────────────────────

function buildScenario7(): DemoScenario {
  const csId = makeId();

  const policyRead: PolicyDecision = {
    decision: "auto-approve",
    tier: RiskTier.READ,
    reason: "Read operation — auto-approved",
    ruleName: "read-auto-approve",
    scopeRequested: "commerce:read",
  };

  const changeSet: ChangeSet = {
    id: csId,
    requestedBy: "auth0|demo-user-001",
    originalPrompt: "Schedule a summer launch for all training gear",
    createdAt: now(),
    status: "draft",
    operations: [
      {
        id: makeId(),
        agent: "reader",
        action: "get_launch_schedule",
        target: "Launch Schedule",
        tier: RiskTier.READ,
        policyExplanation: policyRead,
        diff: [],
        rollback: { action: "none", params: {} },
      },
      {
        id: makeId(),
        agent: "reader",
        action: "get_launch_windows",
        target: "Launch Schedule",
        tier: RiskTier.READ,
        policyExplanation: policyRead,
        diff: [],
        rollback: { action: "none", params: {} },
      },
    ],
    riskSummary: {
      maxTier: RiskTier.READ,
      operationsByTier: { 0: 2, 1: 0, 2: 0, 3: 0 },
      requiresCIBA: false,
      autonomousOps: 2,
      approvalRequiredOps: 0,
    },
  };

  return {
    id: "scenario-7",
    name: "Launch scheduling",
    keywords: ["launch", "schedule", "campaign", "summer", "notification", "notify", "window"],
    changeSet,
    reasoning:
      "Checking the launch schedule and finding available windows for a summer training gear campaign. Existing launches occupy Apr 10–May 15, with a draft overlapping Apr 20–May 10. The first conflict-free window starts after May 15.",
    readerText:
      "| Launch ID | Name | Start Date | End Date | Status | SKUs | Discount % |\n" +
      "|-----------|------|-----------|----------|--------|------|------------|\n" +
      "| L001 | Spring Sale 2026 | 2026-04-10 | 2026-04-30 | Upcoming | STR-001,STR-002,STR-003 | 20 |\n" +
      "| L002 | Training Days | 2026-05-01 | 2026-05-15 | Planned | STR-005,STR-008 | 15 |\n" +
      "| L003 | Back to School 2026 | 2026-04-20 | 2026-05-10 | Draft | STR-004,STR-007,STR-009 | 25 |\n" +
      "| L004 | Winter Clearance 2025 | 2025-12-01 | 2025-12-31 | Completed | STR-004,STR-011 | 30 |\n\n" +
      "**Available window:** May 16 – Jun 30 is conflict-free for training gear (STR-005, STR-008). Recommended: 2-week campaign starting May 16.",
    executionResult: {
      executedAt: now(),
      results: [],
      receipt: {
        changeSetId: csId,
        executedBy: "demo@stride-athletics.com",
        executedAt: now(),
        oboChain: { user: "auth0|demo-user-001", delegatedTo: ["reader"] },
        agentDelegations: [
          {
            agent: "reader",
            actingOnBehalfOf: "auth0|demo-user-001",
            toolsGranted: ["get_launch_schedule", "get_launch_windows"],
            contextReceived: "launch scheduling query",
            tokenExchangeId: `tv_exch_${crypto.randomUUID().slice(0, 8)}`,
            operationsPerformed: ["get_launch_schedule", "get_launch_windows"],
            duration: 620,
          },
        ],
        verification: { checksRun: 0, checksPassed: 0, results: [] },
        rollbackInstructions: "No writes performed — nothing to roll back.",
        auditHash: `sha256:${crypto.randomUUID().replace(/-/g, "")}`,
      },
    },
  };
}

// ── Exported scenarios ──────────────────────────────────────────────

export const DEMO_SCENARIOS: DemoScenario[] = [
  buildScenario1(),
  buildScenario2(),
  buildScenario3(),
  buildScenario4(),
  buildScenario5(),
  buildScenario6(),
  buildScenario7(),
];

/** Suggested prompts shown as chips in the demo UI. */
export const DEMO_SUGGESTIONS = [
  "Apply 20% discount to Classic Runner",
  "Reduce all running shoes by 15%",
  "What's the current price of STR-001?",
  "Roll back the last changeset",
  "Restock Trail Blazer and mark it in stock",
  "Apply 90% clearance to Velocity Racer",
  "Schedule a summer launch for training gear",
];
