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

// ── Exported scenarios ──────────────────────────────────────────────

export const DEMO_SCENARIOS: DemoScenario[] = [
  buildScenario1(),
  buildScenario2(),
  buildScenario3(),
  buildScenario4(),
];

/** Suggested prompts shown as chips in the demo UI. */
export const DEMO_SUGGESTIONS = [
  "Apply 20% discount to Classic Runner",
  "Reduce all running shoes by 15%",
  "What's the current price of STR-001?",
  "Roll back the last changeset",
];
