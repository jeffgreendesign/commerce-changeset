import { ArrowDownIcon, ArrowUpIcon, MinusIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OperationDiff } from "@/lib/changeset/types";

// ── Helpers ──────────────────────────────────────────────────────────

function isCurrency(value: string | number): boolean {
  const s = String(value).trim();
  return /^\$?\d+(\.\d{1,2})?$/.test(s);
}

function parseCurrency(value: string | number): number {
  return parseFloat(String(value).replace(/^\$/, ""));
}

function formatValue(value: string | number | boolean): string {
  const s = String(value);
  if (s === "" || s === "undefined" || s === "null") return "\u2014";
  if (isCurrency(s)) return `$${parseCurrency(s).toFixed(2)}`;
  return s;
}

function computeChange(
  before: string | number | boolean,
  after: string | number | boolean,
): { percent: number; direction: "up" | "down" | "none" } | null {
  const bStr = String(before).trim();
  const aStr = String(after).trim();
  if (!isCurrency(bStr) || !isCurrency(aStr)) return null;
  const b = parseCurrency(bStr);
  const a = parseCurrency(aStr);
  if (b === 0) return null;
  const pct = ((a - b) / b) * 100;
  return {
    percent: Math.abs(pct),
    direction: pct > 0 ? "up" : pct < 0 ? "down" : "none",
  };
}

// ── Component ────────────────────────────────────────────────────────

export function DiffView({ diffs }: { diffs: OperationDiff[] }) {
  if (diffs.length === 0) return null;

  return (
    <div className="space-y-2">
      {diffs.map((d, i) => {
        const change = computeChange(d.before, d.after);
        return (
          <div
            key={i}
            className="flex flex-col gap-1 rounded-md border bg-muted/30 px-3 py-2 text-xs sm:flex-row sm:items-center sm:gap-4"
          >
            {/* Field name */}
            <span className="min-w-[100px] font-medium">{d.field}</span>

            {/* Before → After */}
            <div className="flex flex-1 items-center gap-2">
              <span
                className={cn(
                  "text-red-600 line-through dark:text-red-400",
                  String(d.before).trim() === "" && "text-muted-foreground no-underline",
                )}
              >
                {formatValue(d.before)}
              </span>

              <span className="text-muted-foreground">&rarr;</span>

              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                {formatValue(d.after)}
              </span>
            </div>

            {/* Change magnitude indicator */}
            {change && change.direction !== "none" && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                  change.direction === "down" &&
                    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                  change.direction === "up" &&
                    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
                )}
              >
                {change.direction === "up" ? (
                  <ArrowUpIcon className="size-3" />
                ) : change.direction === "down" ? (
                  <ArrowDownIcon className="size-3" />
                ) : (
                  <MinusIcon className="size-3" />
                )}
                {change.percent.toFixed(0)}%
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
