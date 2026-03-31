"use client";

import { useMemo } from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowRightLeftIcon,
  ZapIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RiskTier } from "@/lib/policy/types";
import type { Operation, OperationDiff } from "@/lib/changeset/types";
import type { ProactiveIssue } from "@/lib/voice/types";
import type { Product, WorkspacePhase } from "./workspace-provider";

export interface TileClickModifiers {
  metaKey: boolean;
  ctrlKey: boolean;
}

interface ProductTileProps {
  product: Product;
  selected: boolean;
  onClick: (modifiers: TileClickModifiers) => void;
  operation?: Operation;
  phase?: WorkspacePhase;
  proactiveIssues?: ProactiveIssue[];
}

// ── Diff helpers ────────────────────────────────────────────────────

function findDiffByPattern(
  diffs: OperationDiff[],
  pattern: RegExp,
): OperationDiff | undefined {
  return diffs.find((d) => pattern.test(d.field));
}

function parseCurrencyValue(value: string | number | boolean): number {
  return parseFloat(String(value).replace(/[^0-9.]/g, ""));
}

function computeChangePct(
  before: string | number | boolean,
  after: string | number | boolean,
): { pct: number; direction: "up" | "down" } | null {
  const b = parseCurrencyValue(before);
  const a = parseCurrencyValue(after);
  if (Number.isNaN(b) || Number.isNaN(a) || b === 0) return null;
  const pct = ((a - b) / b) * 100;
  if (pct === 0) return null;
  return { pct: Math.abs(pct), direction: pct > 0 ? "up" : "down" };
}

/** Summarize a non-price diff as a human-readable label. */
function describeDiff(diff: OperationDiff): string {
  const field = diff.field.toLowerCase();
  if (field.includes("promo") || field.includes("status")) {
    const val = String(diff.after).toLowerCase();
    return val === "active" || val === "true" || val === "yes"
      ? "Promo ON"
      : "Promo OFF";
  }
  if (field.includes("inventory")) {
    return `Inv → ${diff.after}`;
  }
  return `${diff.field}: ${String(diff.before)} → ${String(diff.after)}`;
}

// ── Tier indicator colors ───────────────────────────────────────────

const TIER_DOT_STYLE: Record<number, string> = {
  [RiskTier.READ]: "oklch(0.65 0.2 145)", // green
  [RiskTier.NOTIFY]: "oklch(0.6 0.18 264)", // blue
  [RiskTier.WRITE]: "oklch(0.7 0.18 85)", // amber
  [RiskTier.BULK]: "oklch(0.6 0.22 29)", // red
};

// ── Component ───────────────────────────────────────────────────────

export function ProductTile({
  product,
  selected,
  onClick,
  operation,
  phase,
  proactiveIssues,
}: ProductTileProps) {
  const showDiff =
    !!operation &&
    (phase === "preview" || phase === "executing" || phase === "complete");

  const diffs = useMemo(() => {
    if (!showDiff || !Array.isArray(operation.diff)) return null;
    const priceDiff = findDiffByPattern(operation.diff, /price/i);
    const promoDiff = findDiffByPattern(operation.diff, /promo|status/i);
    const inventoryDiff = findDiffByPattern(operation.diff, /inventory/i);
    // Collect non-price diffs for the change summary
    const otherDiffs = operation.diff.filter((d) => !/price/i.test(d.field));
    return { priceDiff, promoDiff, inventoryDiff, otherDiffs, all: operation.diff };
  }, [showDiff, operation]);

  const change = useMemo(
    () =>
      diffs?.priceDiff
        ? computeChangePct(diffs.priceDiff.before, diffs.priceDiff.after)
        : null,
    [diffs],
  );

  const newPrice = diffs?.priceDiff
    ? parseCurrencyValue(diffs.priceDiff.after)
    : product.price;

  const hasPriceDiff = !!diffs?.priceDiff;
  const hasNonPriceDiff = !!diffs && diffs.otherDiffs.length > 0;

  // Highest-severity proactive issue for this tile
  const maxIssueSeverity = useMemo(() => {
    if (!proactiveIssues || proactiveIssues.length === 0) return null;
    if (proactiveIssues.some((i) => i.severity === "error")) return "error";
    if (proactiveIssues.some((i) => i.severity === "warning")) return "warning";
    return "info";
  }, [proactiveIssues]);

  const issueLabel = useMemo(() => {
    if (!proactiveIssues || proactiveIssues.length === 0) return undefined;
    return proactiveIssues.map((i) => i.description).join("; ");
  }, [proactiveIssues]);

  return (
    <div
      className={cn(
        "product-tile cursor-pointer px-4 py-4 min-h-[44px]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
      )}
      role="option"
      tabIndex={0}
      aria-selected={selected}
      aria-label={
        showDiff && diffs?.priceDiff
          ? `${product.name}, ${product.sku}, price $${parseCurrencyValue(diffs.priceDiff.before).toFixed(2)} to $${newPrice.toFixed(2)}, risk tier ${operation?.tier ?? 0}`
          : `${product.name}, ${product.sku}, $${product.price.toFixed(2)}`
      }
      data-selected={selected}
      data-promo={product.promoStatus}
      data-category={product.category}
      data-has-diff={showDiff || undefined}
      data-recently-changed={phase === "complete" && showDiff ? true : undefined}
      data-has-issue={maxIssueSeverity ?? undefined}
      onClick={(e) => onClick({ metaKey: e.metaKey, ctrlKey: e.ctrlKey })}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick({ metaKey: e.metaKey, ctrlKey: e.ctrlKey });
        }
      }}
    >
      {/* Issue aura — dedicated element to avoid ::after conflict with promo glow */}
      {maxIssueSeverity && (
        <span
          className="tile-issue-aura"
          data-severity={maxIssueSeverity}
          aria-hidden="true"
        />
      )}

      {/* Product name */}
      <p className="text-sm font-medium leading-tight truncate">
        {product.name}
      </p>

      {/* SKU */}
      <p className="mt-0.5 text-[11px] text-muted-foreground tracking-wide">
        {product.sku}
      </p>

      {/* Price — with optional diff overlay */}
      {showDiff && hasPriceDiff && diffs?.priceDiff ? (
        <div className="mt-2 flex items-baseline gap-2 flex-wrap">
          <span className="tile-price-old text-2xl font-bold tracking-tight">
            ${parseCurrencyValue(diffs.priceDiff.before).toFixed(2)}
          </span>
          <span className="tile-price-new text-2xl font-bold tracking-tight">
            ${(Number.isNaN(newPrice) ? product.price : newPrice).toFixed(2)}
          </span>
          {change && (
            <span className="tile-change-badge inline-flex items-center gap-0.5">
              {change.direction === "down" ? (
                <ArrowDownIcon className="size-3" />
              ) : (
                <ArrowUpIcon className="size-3" />
              )}
              {change.pct.toFixed(0)}%
            </span>
          )}
        </div>
      ) : (
        <p className="mt-2 text-2xl font-bold tracking-tight">
          ${product.price.toFixed(2)}
        </p>
      )}

      {/* Non-price diff badges (promo toggle, inventory, etc.) */}
      {showDiff && hasNonPriceDiff && diffs && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {diffs.otherDiffs.map((d, i) => (
            <span
              key={i}
              className="tile-change-badge inline-flex items-center gap-0.5"
            >
              {/promo|status/i.test(d.field) ? (
                <ZapIcon className="size-3" />
              ) : (
                <ArrowRightLeftIcon className="size-3" />
              )}
              {describeDiff(d)}
            </span>
          ))}
        </div>
      )}

      {/* Inventory + promo/risk/issue row */}
      <div className="mt-1.5 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {product.inventory.toLocaleString()} units
        </span>
        <span className="inline-flex items-center gap-1">
          {maxIssueSeverity && (
            <span
              className="inline-block size-2.5 rounded-full"
              style={{
                background:
                  maxIssueSeverity === "error"
                    ? "oklch(0.6 0.22 29)"
                    : maxIssueSeverity === "warning"
                      ? "oklch(0.7 0.18 85)"
                      : "oklch(0.6 0.18 264)",
              }}
              aria-label={issueLabel}
            />
          )}
          {showDiff && operation ? (
            <span
              className="inline-block size-2.5 rounded-full"
              style={{
                background: TIER_DOT_STYLE[operation.tier] ?? "oklch(0.5 0.1 0)",
              }}
              aria-label={`Risk tier ${operation.tier}`}
            />
          ) : (
            product.promoStatus === "active" && (
              <span
                className="inline-block size-2.5 rounded-full"
                style={{ background: "oklch(0.65 0.2 145)" }}
                aria-label="Active promotion"
              />
            )
          )}
        </span>
      </div>
    </div>
  );
}
