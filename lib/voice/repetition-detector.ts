/**
 * Repetition Detector — analyzes decomposed operations for repetitive patterns
 * and suggests bulk alternatives.
 *
 * Example: "We are changing these shoe promo prices one by one. Would you like
 * me to bulk apply them to every product in this promotion?"
 */

import type { ParsedOperation } from "@/lib/changeset/builder";
import type { RepetitionSignal, ConfirmationRow } from "./types";

/** Minimum number of same-action operations to trigger a repetition signal. */
const REPETITION_THRESHOLD = 3;

/**
 * Actions that can be converted to bulk equivalents.
 * Maps individual action → bulk action.
 */
const BULK_EQUIVALENTS: Record<string, string> = {
  update_price: "bulk_price_change",
};

/**
 * Analyze a set of parsed operations for repetitive patterns.
 *
 * Detects when:
 * - The same action is repeated 3+ times
 * - Operations target the same category (based on SKU prefix)
 * - Operations apply a uniform change (same diff pattern)
 *
 * Returns a RepetitionSignal with a suggestion and confirmation table,
 * or a signal with `isRepetitive: false` if no pattern is found.
 */
export function detectRepetition(
  operations: ParsedOperation[]
): RepetitionSignal {
  // Group operations by action type
  const byAction = new Map<string, ParsedOperation[]>();
  for (const op of operations) {
    const existing = byAction.get(op.action) ?? [];
    existing.push(op);
    byAction.set(op.action, existing);
  }

  // Look for repeated individual actions that could be bulk
  for (const [action, ops] of byAction) {
    if (ops.length < REPETITION_THRESHOLD) continue;

    const bulkAction = BULK_EQUIVALENTS[action];

    // Check if all operations apply a similar percentage change
    const percentages = ops
      .map((op) => op.priceChangePercent)
      .filter((p): p is number => p !== undefined);

    const isUniformDiscount =
      percentages.length > 0 &&
      percentages.every((p) => Math.abs(p - percentages[0]) < 1);

    // Build confirmation table
    const confirmationTable: ConfirmationRow[] = ops.map((op) => {
      const priceDiff = op.diff.find(
        (d) => d.field === "Promo Price" || d.field.startsWith("Promo Price")
      );
      return {
        sku: extractSku(op.target),
        productName: extractProductName(op.target),
        currentPrice: String(priceDiff?.before ?? "N/A"),
        proposedPrice: String(priceDiff?.after ?? "N/A"),
        field: priceDiff?.field ?? op.diff[0]?.field ?? action,
      };
    });

    const affectedTargets = ops.map((op) => extractSku(op.target));

    const discountText = isUniformDiscount
      ? ` (${percentages[0]}% discount)`
      : "";

    return {
      isRepetitive: true,
      patternDescription: `${ops.length} sequential ${action} operations on individual products${discountText}`,
      suggestedBulkAction: bulkAction,
      affectedTargets,
      confirmationTable,
    };
  }

  // Check for same-category targeting (multiple ops on SKUs with same prefix)
  const skuPrefixes = operations
    .map((op) => extractSkuPrefix(op.target))
    .filter(Boolean);

  if (skuPrefixes.length >= REPETITION_THRESHOLD) {
    const prefixCounts = new Map<string, number>();
    for (const prefix of skuPrefixes) {
      prefixCounts.set(prefix, (prefixCounts.get(prefix) ?? 0) + 1);
    }

    for (const [prefix, count] of prefixCounts) {
      if (count >= REPETITION_THRESHOLD) {
        const categoryOps = operations.filter((op) =>
          op.target.startsWith(prefix)
        );

        return {
          isRepetitive: true,
          patternDescription: `${count} operations targeting ${prefix}-series products — consider a category-wide update`,
          affectedTargets: categoryOps.map((op) => extractSku(op.target)),
          confirmationTable: categoryOps.map((op) => ({
            sku: extractSku(op.target),
            productName: extractProductName(op.target),
            currentPrice: String(op.diff[0]?.before ?? "N/A"),
            proposedPrice: String(op.diff[0]?.after ?? "N/A"),
            field: op.diff[0]?.field ?? op.action,
          })),
        };
      }
    }
  }

  return {
    isRepetitive: false,
    patternDescription: "",
    affectedTargets: [],
    confirmationTable: [],
  };
}

// ── Helpers ──────────────────────────────────────────────────────────

function extractSku(target: string): string {
  const match = target.match(/^(STR-\d{3})/);
  return match?.[1] ?? target;
}

function extractProductName(target: string): string {
  const match = target.match(/^STR-\d{3}\s+(.+)/);
  return match?.[1] ?? target;
}

function extractSkuPrefix(target: string): string {
  const match = target.match(/^([A-Z]+-)/);
  return match?.[1] ?? "";
}
