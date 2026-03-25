/**
 * Orchestrator Agent — decomposes natural-language requests into change sets.
 *
 * Deterministic three-step pipeline:
 *   1. Gather current state → delegates to Reader Agent for product/schedule data
 *   2. Analyze request      → LLM decomposes prompt into discrete operations
 *   3. Build change set     → assembles operations into a draft ChangeSet
 *
 * The orchestrator plans only — it never executes writes.
 */

import { generateObject } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { z } from "zod/v4";

import { runReaderAgent } from "@/lib/agents/reader";
import { buildChangeSet } from "@/lib/changeset/builder";
import type { ParsedOperation } from "@/lib/changeset/builder";

// ── Types ────────────────────────────────────────────────────────────

export interface OrchestratorResult {
  changeSet: Awaited<ReturnType<typeof buildChangeSet>>;
  reasoning: string;
}

// ── Zod schema for LLM-generated operations ─────────────────────────

const OperationDiffSchema = z.object({
  field: z.string(),
  before: z.union([z.string(), z.number(), z.boolean()]),
  after: z.union([z.string(), z.number(), z.boolean()]),
});

const ParsedOperationSchema = z.object({
  agent: z.enum(["reader", "writer", "notifier"]),
  action: z.enum(["update_price", "set_promo_status", "update_inventory_flag", "bulk_price_change"]),
  target: z.string(),
  diff: z.array(OperationDiffSchema),
  operationType: z.enum(["read", "notify", "write"]),
  affectedRecords: z.coerce.number().optional(),
  priceChangePercent: z.coerce.number().optional(),
});

// ── Decomposition prompt ────────────────────────────────────────────

const DECOMPOSITION_SYSTEM = `You are an operation decomposer for Stride Athletics commerce data. Given a user request and current product/schedule state, decompose it into discrete operations.

Allowed writer actions (use EXACTLY these names):
- "update_price" — modifies the Promo Price for a single SKU
- "set_promo_status" — modifies the Promo Active flag for a single SKU
- "update_inventory_flag" — modifies the Inventory flag for a single SKU
- "bulk_price_change" — batch price update across multiple SKUs (use when same discount applies to 2+ products)
Do not invent other action names. Every write operation must use one of these actions.

Diff semantics (CRITICAL):
- "before" = the CURRENT value of that field exactly as it appears in the sheet data provided. Copy it verbatim. If the field is blank or empty in the sheet, use "" (empty string).
- "after" = the NEW value you want to write to that field.
- "before" and "after" MUST be different. If they are identical the operation is a no-op and will be discarded.
- For update_price: the field is "Promo Price". "before" is the current Promo Price from the sheet (may be blank). "after" is the newly calculated discounted price.
- For set_promo_status: the field is "Promo Active". "before" is the current value (e.g., "FALSE"). "after" is the desired value (e.g., "TRUE").

Rules:
- Setting a discount or launching a promo ALWAYS requires BOTH:
  1. set_promo_status for each affected SKU (toggle Promo Active to the desired value)
  2. update_price (1 SKU) or bulk_price_change (2+ SKUs) to set the computed Promo Price
  Do NOT omit the status toggle. Do NOT omit the price update. Both are required.
- For single-record actions (update_price, set_promo_status, update_inventory_flag): each operation modifies exactly ONE field on ONE target. Include the product name in the target (e.g., "STR-001 Classic Runner"). Set affectedRecords: 1.
- For bulk_price_change: create ONE operation with multiple diff entries, one per SKU. Each diff field must encode the SKU: "Promo Price (STR-001)". Set target to a summary like "3 products". Set affectedRecords to the number of SKUs (this triggers Tier 3 escalation). Compute priceChangePercent from the largest individual change.
- Use the launch schedule data to determine discount percentages and which SKUs are involved.
- Calculate promo prices by applying the discount % to each product's base price. Round to 2 decimal places.
- Compute priceChangePercent as the absolute percentage decrease from the base price.
- All write operations should have agent: "writer", operationType: "write".
- Notification operations should have agent: "notifier", operationType: "notify".
- Include the product name in the target for single-record ops (e.g., "STR-001 Classic Runner").
- If the user's request is purely informational (asking about current state, prices, schedule, etc.) and requires no changes, return an empty operations array. Do not fabricate operations for read-only queries.
- If the requested change is already reflected in the current state (e.g., the discount is already applied, the promo is already active), return an empty operations array.
- Always provide a "reasoning" field: 1-2 sentences explaining what changes you identified and why. If no changes are needed, explain clearly why (e.g., "STR-001 Classic Runner already has a 20% discount active at $71.99 promo price.").

Examples:

Single-SKU discount — "Set a 20% discount on STR-001 Classic Runner" (Base Price: 129.99, Promo Price currently blank, Promo Active: FALSE):
[
  { "agent": "writer", "action": "set_promo_status", "target": "STR-001 Classic Runner",
    "diff": [{ "field": "Promo Active", "before": "FALSE", "after": "TRUE" }],
    "operationType": "write", "affectedRecords": 1 },
  { "agent": "writer", "action": "update_price", "target": "STR-001 Classic Runner",
    "diff": [{ "field": "Promo Price", "before": "", "after": 103.99 }],
    "operationType": "write", "affectedRecords": 1, "priceChangePercent": 20 }
]

Bulk discount — "Apply 15% off to all running shoes" (3 SKUs, Promo Active all FALSE):
[
  { "agent": "writer", "action": "set_promo_status", "target": "STR-001 Classic Runner",
    "diff": [{ "field": "Promo Active", "before": "FALSE", "after": "TRUE" }],
    "operationType": "write", "affectedRecords": 1 },
  { "agent": "writer", "action": "set_promo_status", "target": "STR-002 Trail Blazer",
    "diff": [{ "field": "Promo Active", "before": "FALSE", "after": "TRUE" }],
    "operationType": "write", "affectedRecords": 1 },
  { "agent": "writer", "action": "set_promo_status", "target": "STR-003 Speed Lite",
    "diff": [{ "field": "Promo Active", "before": "FALSE", "after": "TRUE" }],
    "operationType": "write", "affectedRecords": 1 },
  { "agent": "writer", "action": "bulk_price_change", "target": "3 products",
    "diff": [
      { "field": "Promo Price (STR-001)", "before": "", "after": 110.49 },
      { "field": "Promo Price (STR-002)", "before": "", "after": 144.49 },
      { "field": "Promo Price (STR-003)", "before": "", "after": 84.99 }
    ],
    "operationType": "write", "affectedRecords": 3, "priceChangePercent": 15 }
]

Return a JSON array of operations.`;

// ── Orchestrator pipeline ───────────────────────────────────────────

export async function runOrchestratorAgent(
  message: string,
  refreshToken: string,
  userId: string
): Promise<OrchestratorResult> {
  const anthropic = createAnthropic();

  // Step 1: Gather current state via Reader Agent
  const readerStart = performance.now();
  const readerResult = await runReaderAgent(
    "Show me all products with their full pricing details and the complete launch schedule.",
    refreshToken
  );
  console.log(`[orchestrator] Reader agent returned ${readerResult.toolResults.length} tool results in ${Math.round(performance.now() - readerStart)}ms`);

  // Combine the reader's text summary and raw tool results for maximum context.
  const currentState = [
    "## Reader Agent Summary",
    readerResult.text,
    "",
    "## Raw Tool Results",
    JSON.stringify(readerResult.toolResults, null, 2),
  ].join("\n");

  // Step 2: Analyze request — LLM decomposes into discrete operations
  // Wrapped in an object because Anthropic requires top-level type: 'object'.
  const decompStart = performance.now();
  const { object: decomposition } = await generateObject({
    model: anthropic("claude-sonnet-4-20250514"),
    schema: z.object({
      operations: z.array(ParsedOperationSchema),
      reasoning: z.string().describe(
        "1-2 sentence explanation of what changes are needed and why, or why no changes are needed if the current state already matches the request"
      ),
    }),
    system: DECOMPOSITION_SYSTEM,
    prompt: `User request: "${message}"\n\nCurrent state:\n${currentState}`,
  });
  const operations = decomposition.operations;
  console.log(`[orchestrator] Decomposed into ${operations.length} operations in ${Math.round(performance.now() - decompStart)}ms: ${operations.map((o) => o.action).join(", ")}`);

  // Step 3: Build the change set with policy evaluation + rollback
  const changeSet = await buildChangeSet({
    requestedBy: userId,
    originalPrompt: message,
    operations: operations as ParsedOperation[],
  });
  console.log(`[orchestrator] ChangeSet ${changeSet.id.slice(0, 8)} built — ${changeSet.operations.length} ops, max tier ${changeSet.riskSummary.maxTier}, CIBA: ${changeSet.riskSummary.requiresCIBA}`);

  // Use the LLM's reasoning when the final changeset has 0 operations —
  // covers "already applied", "informational query", and "builder filtered all ops".
  const reasoning = changeSet.operations.length === 0
    ? decomposition.reasoning
    : `Gathered current product catalog and launch schedule via Reader Agent. ` +
      `Decomposed request into ${changeSet.operations.length} operations. ` +
      `Assembled draft change set with policy evaluation and rollback instructions.`;

  return { changeSet, reasoning };
}
