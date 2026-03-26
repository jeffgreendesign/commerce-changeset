/**
 * Proactive Insights — post-processes reader data and changeset operations
 * to detect issues before the user asks.
 *
 * Examples:
 * - "STR-005 has a promo price below your cost floor."
 * - "Promo is active but no discount is applied — inconsistency detected."
 * - "This launch window conflicts with an existing promotion."
 */

import type { ParsedOperation } from "@/lib/changeset/builder";
import type { ProactiveIssue } from "./types";

/** Minimum margin percentage — prices below this floor trigger a warning. */
const MIN_MARGIN_PERCENT = 15;

/**
 * Run proactive checks against proposed operations and current product data.
 *
 * Checks performed:
 * 1. Margin floor violations — promo price too low relative to base price
 * 2. Inconsistency detection — promo active without discount, or vice versa
 * 3. Duplicate operations — same target modified multiple times
 *
 * @param operations - The parsed operations from the orchestrator
 * @param productData - Current product catalog from the reader agent
 * @returns Array of proactive issues found (may be empty)
 */
export function runProactiveChecks(
  operations: ParsedOperation[],
  productData: Record<string, string>[]
): ProactiveIssue[] {
  const issues: ProactiveIssue[] = [];

  issues.push(...checkMarginFloors(operations, productData));
  issues.push(...checkInconsistencies(operations, productData));
  issues.push(...checkDuplicateTargets(operations));

  return issues;
}

// ── Margin floor checks ─────────────────────────────────────────────

function checkMarginFloors(
  operations: ParsedOperation[],
  productData: Record<string, string>[]
): ProactiveIssue[] {
  const issues: ProactiveIssue[] = [];

  for (const op of operations) {
    if (op.action !== "update_price" && op.action !== "bulk_price_change") {
      continue;
    }

    for (const diff of op.diff) {
      const afterPrice = Number(diff.after);
      if (isNaN(afterPrice)) continue;

      // Find the product's base price
      const sku = extractSku(op.target, diff.field);
      const product = productData.find((p) => p["SKU"] === sku);
      const basePrice = Number(product?.["Base Price"]);

      if (isNaN(basePrice) || basePrice === 0) continue;

      const marginPercent =
        ((basePrice - afterPrice) / basePrice) * 100;

      // Check if discount exceeds safe margin
      if (marginPercent > (100 - MIN_MARGIN_PERCENT)) {
        const minPrice = Number((basePrice * (MIN_MARGIN_PERCENT / 100)).toFixed(2));

        issues.push({
          severity: "error",
          operationId: op.target,
          description: `${sku} promo price ($${afterPrice}) leaves only ${(100 - marginPercent).toFixed(1)}% margin — below the ${MIN_MARGIN_PERCENT}% floor. Minimum safe price: $${minPrice.toFixed(2)}`,
          suggestedFix: {
            action: op.action,
            target: op.target,
            field: diff.field,
            currentValue: afterPrice,
            suggestedValue: Number(
              (basePrice * (1 - (100 - MIN_MARGIN_PERCENT) / 100)).toFixed(2)
            ),
          },
        });
      }

      // Warn on very large discounts (>50%)
      if (marginPercent > 50 && marginPercent <= (100 - MIN_MARGIN_PERCENT)) {
        issues.push({
          severity: "warning",
          operationId: op.target,
          description: `${sku} has a ${marginPercent.toFixed(0)}% discount — unusually large. Verify this is intentional.`,
        });
      }
    }
  }

  return issues;
}

// ── Inconsistency checks ─────────────────────────────────────────────

function checkInconsistencies(
  operations: ParsedOperation[],
  productData: Record<string, string>[]
): ProactiveIssue[] {
  const issues: ProactiveIssue[] = [];

  // Build a map of what the changeset will produce
  const promoStatusChanges = new Map<string, string>();
  const priceChanges = new Map<string, boolean>();

  for (const op of operations) {
    const sku = extractSku(op.target, op.diff[0]?.field ?? "");

    if (op.action === "set_promo_status") {
      const afterValue = String(op.diff[0]?.after ?? "").toUpperCase();
      promoStatusChanges.set(sku, afterValue);
    }

    if (op.action === "update_price" || op.action === "bulk_price_change") {
      priceChanges.set(sku, true);
    }
  }

  // Check: Promo set to active but no price change in this changeset
  for (const [sku, status] of promoStatusChanges) {
    if (status === "TRUE" && !priceChanges.has(sku)) {
      // Check if product already has a promo price
      const product = productData.find((p) => p["SKU"] === sku);
      const existingPromoPrice = product?.["Promo Price"];

      if (!existingPromoPrice || existingPromoPrice.trim() === "") {
        issues.push({
          severity: "warning",
          operationId: sku,
          description: `${sku} promo status set to active, but no promo price exists and none is being set in this changeset.`,
        });
      }
    }
  }

  // Check: Price being set but promo not being activated (and currently inactive)
  for (const [sku] of priceChanges) {
    if (!promoStatusChanges.has(sku)) {
      const product = productData.find((p) => p["SKU"] === sku);
      const currentStatus = product?.["Promo Active"]?.toUpperCase();

      if (currentStatus === "FALSE") {
        issues.push({
          severity: "info",
          operationId: sku,
          description: `${sku} promo price is being updated, but Promo Active is currently FALSE and not being changed. The new price won't take effect until the promo is activated.`,
        });
      }
    }
  }

  return issues;
}

// ── Duplicate target checks ──────────────────────────────────────────

function checkDuplicateTargets(
  operations: ParsedOperation[]
): ProactiveIssue[] {
  const issues: ProactiveIssue[] = [];

  const targetActionCounts = new Map<string, number>();
  for (const op of operations) {
    const key = `${op.action}:${op.target}`;
    targetActionCounts.set(key, (targetActionCounts.get(key) ?? 0) + 1);
  }

  for (const [key, count] of targetActionCounts) {
    if (count > 1) {
      const [action, target] = key.split(":");
      issues.push({
        severity: "warning",
        operationId: target,
        description: `${target} has ${count} duplicate ${action} operations — only the last will take effect.`,
      });
    }
  }

  return issues;
}

// ── Helpers ──────────────────────────────────────────────────────────

function extractSku(target: string, field: string): string {
  // Try extracting from target first (e.g. "STR-001 Classic Runner")
  const targetMatch = target.match(/^(STR-\d{3})/);
  if (targetMatch) return targetMatch[1];

  // Try extracting from field name (e.g. "Promo Price (STR-001)")
  const fieldMatch = field.match(/\((STR-\d{3})\)/);
  if (fieldMatch) return fieldMatch[1];

  return target;
}
