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
  action: z.string(),
  target: z.string(),
  diff: z.array(OperationDiffSchema),
  operationType: z.enum(["read", "notify", "write"]),
  affectedRecords: z.coerce.number().optional(),
  priceChangePercent: z.coerce.number().optional(),
});

// ── Decomposition prompt ────────────────────────────────────────────

const DECOMPOSITION_SYSTEM = `You are an operation decomposer for Stride Athletics commerce data. Given a user request and current product/schedule state, decompose it into discrete operations.

Rules:
- Each operation modifies exactly ONE field on ONE target.
- For a promotion launch, you typically need:
  - set_promo_status for each SKU (Promo Active: FALSE → TRUE)
  - update_price for each SKU (Base Price → discounted Promo Price)
- Use the launch schedule data to determine discount percentages and which SKUs are involved.
- Calculate promo prices by applying the discount % to each product's base price. Round to 2 decimal places.
- Compute priceChangePercent as the absolute percentage decrease from the base price.
- All write operations should have agent: "writer", operationType: "write", affectedRecords: 1.
- Notification operations should have agent: "notifier", operationType: "notify".
- Include the product name in the target (e.g., "STR-001 Classic Runner").

Return a JSON array of operations.`;

// ── Orchestrator pipeline ───────────────────────────────────────────

export async function runOrchestratorAgent(
  message: string,
  refreshToken: string,
  userId: string
): Promise<OrchestratorResult> {
  const anthropic = createAnthropic();

  // Step 1: Gather current state via Reader Agent
  const readerResult = await runReaderAgent(
    "Show me all products with their full pricing details and the complete launch schedule.",
    refreshToken
  );

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
  const { object: decomposition } = await generateObject({
    model: anthropic("claude-sonnet-4-20250514"),
    schema: z.object({
      operations: z.array(ParsedOperationSchema),
    }),
    system: DECOMPOSITION_SYSTEM,
    prompt: `User request: "${message}"\n\nCurrent state:\n${currentState}`,
  });
  const operations = decomposition.operations;

  // Step 3: Build the change set with policy evaluation + rollback
  const changeSet = await buildChangeSet({
    requestedBy: userId,
    originalPrompt: message,
    operations: operations as ParsedOperation[],
  });

  return {
    changeSet,
    reasoning:
      `Gathered current product catalog and launch schedule via Reader Agent. ` +
      `Decomposed request into ${operations.length} operations. ` +
      `Assembled draft change set with policy evaluation and rollback instructions.`,
  };
}
