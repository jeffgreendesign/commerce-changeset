"use client";

import {
  LoaderIcon,
  XIcon,
  PlayIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { RiskTier } from "@/lib/policy/types";
import type { ChangeSet, Operation, OperationDiff } from "@/lib/changeset/types";
import { cn } from "@/lib/utils";

// ── Tier display config ─────────────────────────────────────────────

const TIER_CONFIG: Record<number, { label: string; className: string }> = {
  [RiskTier.READ]: {
    label: "Read",
    className:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  [RiskTier.NOTIFY]: {
    label: "Notify",
    className:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  [RiskTier.WRITE]: {
    label: "Write",
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  },
  [RiskTier.BULK]: {
    label: "Bulk",
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
};

interface ChangesetSummaryProps {
  changeset: ChangeSet;
  onCancel: () => void;
  onExecute: () => Promise<void>;
  executing: boolean;
}

export function ChangesetSummary({
  changeset,
  onCancel,
  onExecute,
  executing,
}: ChangesetSummaryProps) {
  const opCount = changeset.operations.length;
  const maxTier =
    typeof changeset.riskSummary?.maxTier === "number"
      ? changeset.riskSummary.maxTier
      : RiskTier.READ;
  const tierConfig = TIER_CONFIG[maxTier] ?? {
    label: `Tier ${maxTier}`,
    className: "bg-muted text-muted-foreground",
  };
  const requiresCIBA = changeset.riskSummary?.requiresCIBA === true;

  // Build compact diff summary — show up to 3 operations
  const MAX_OPS_SHOWN = 3;
  const visibleOps = changeset.operations.slice(0, MAX_OPS_SHOWN);
  const hiddenCount = opCount - visibleOps.length;

  return (
    <div className="changeset-summary w-full max-w-md mx-auto">
      <div className="rounded-xl border bg-card/95 px-4 py-3 shadow-lg backdrop-blur-sm">
        {/* Header: ID + prompt */}
        <p className="text-xs text-muted-foreground truncate">
          Changeset {changeset.id.slice(0, 8)}
        </p>
        <p className="mt-0.5 text-sm font-medium leading-tight line-clamp-2">
          &ldquo;{changeset.originalPrompt}&rdquo;
        </p>

        {/* Stats row */}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <span>
            {opCount} operation{opCount !== 1 ? "s" : ""}
          </span>
          <span className="text-muted-foreground">&middot;</span>
          <span
            className={cn(
              "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium",
              tierConfig.className,
            )}
          >
            {tierConfig.label} risk
          </span>
          {requiresCIBA && (
            <>
              <span className="text-muted-foreground">&middot;</span>
              <span className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
                <ShieldCheckIcon className="size-3" />
                Approval required
              </span>
            </>
          )}
        </div>

        {/* Field-level diff details */}
        {visibleOps.length > 0 && (
          <ul className="mt-2 space-y-1 text-[11px] text-muted-foreground">
            {visibleOps.map((op: Operation) => (
              <li key={op.id} className="leading-snug">
                <span className="font-mono">{op.target}</span>
                {Array.isArray(op.diff) && op.diff.length > 0 && (
                  <>
                    {": "}
                    {op.diff.map((d: OperationDiff, i: number) => (
                      <span key={i}>
                        {i > 0 && ", "}
                        <span className="font-medium text-foreground">
                          {d.field}
                        </span>{" "}
                        {String(d.before)} → {String(d.after)}
                      </span>
                    ))}
                  </>
                )}
              </li>
            ))}
            {hiddenCount > 0 && (
              <li className="text-muted-foreground/60">
                +{hiddenCount} more operation{hiddenCount !== 1 ? "s" : ""}
              </li>
            )}
          </ul>
        )}

        {/* CIBA approval hint — visible during execution when approval needed */}
        {executing && requiresCIBA && (
          <div className="mt-2 flex items-center gap-2 rounded-lg bg-violet-50 px-3 py-2 text-xs text-violet-700 dark:bg-violet-950/30 dark:text-violet-300">
            <SmartphoneIcon className="size-4 shrink-0 animate-pulse" />
            <span>Approve on your Auth0 Guardian app to continue</span>
          </div>
        )}

        {/* Actions */}
        <div className="mt-3 flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="min-h-[36px] gap-1"
            onClick={onCancel}
            disabled={executing}
          >
            <XIcon className="size-3.5" />
            Cancel
          </Button>
          <Button
            variant="default"
            size="sm"
            className="min-h-[36px] gap-1"
            onClick={onExecute}
            disabled={executing}
          >
            {executing && requiresCIBA ? (
              <>
                <LoaderIcon className="size-3.5 animate-spin" />
                Awaiting approval...
              </>
            ) : executing ? (
              <>
                <LoaderIcon className="size-3.5 animate-spin" />
                Writing changes...
              </>
            ) : (
              <>
                <PlayIcon className="size-3.5" />
                Execute
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
