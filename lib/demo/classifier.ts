/**
 * Hybrid demo classifier — keyword match first, Haiku fallback second.
 *
 * Returns a matching DemoScenario or null (display "try these" nudge).
 */

import { generateObject } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { z } from "zod/v4";

import { DEMO_SCENARIOS, type DemoScenario } from "./scenarios";

/** Try keyword matching first (instant, free). */
function keywordMatch(prompt: string): DemoScenario | null {
  const lower = prompt.toLowerCase();
  for (const scenario of DEMO_SCENARIOS) {
    const matched = scenario.keywords.some((kw) => lower.includes(kw));
    if (matched) return scenario;
  }
  return null;
}

/** Fall back to Haiku for fuzzy intent classification (~$0.001). */
async function haikuClassify(prompt: string): Promise<DemoScenario | null> {
  try {
    const anthropic = createAnthropic();
    const { object } = await generateObject({
      model: anthropic("claude-haiku-4-5-20251001"),
      schema: z.object({
        scenarioIndex: z
          .number()
          .min(0)
          .max(6)
          .nullable()
          .describe("Index of the best-matching scenario, or null if none fit"),
      }),
      system:
        "Pick the closest scenario (0-6) for the user's commerce request, or null if none match.\n" +
        "0: Single product discount or promo change\n" +
        "1: Bulk price change across multiple products\n" +
        "2: Read-only query about products, prices, or inventory\n" +
        "3: Rollback or undo a previous change\n" +
        "4: Inventory status change (restock, mark out of stock, pre-order)\n" +
        "5: Deep discount or clearance with proactive warnings\n" +
        "6: Launch scheduling, campaign planning, or notifications",
      prompt: `User said: "${prompt}"`,
    });

    if (object.scenarioIndex !== null && DEMO_SCENARIOS[object.scenarioIndex]) {
      return DEMO_SCENARIOS[object.scenarioIndex];
    }
    return null;
  } catch (err) {
    console.error("[demo-classifier] Haiku classification failed:", err);
    return null;
  }
}

/**
 * Match user prompt to a demo scenario.
 * 1. Keyword scan (instant, 0 cost)
 * 2. Haiku fallback (<1s, ~$0.001)
 * 3. null → show suggestion chips
 */
export async function matchScenario(
  prompt: string
): Promise<DemoScenario | null> {
  const fast = keywordMatch(prompt);
  if (fast) {
    console.log(`[demo-classifier] Keyword match: ${fast.name}`);
    return fast;
  }

  console.log("[demo-classifier] No keyword match, trying Haiku...");
  const haiku = await haikuClassify(prompt);
  if (haiku) {
    console.log(`[demo-classifier] Haiku match: ${haiku.name}`);
  } else {
    console.log("[demo-classifier] No match found");
  }
  return haiku;
}
