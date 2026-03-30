"use client";

import { LoaderIcon, XIcon, PlayIcon, ShieldCheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RiskTier } from "@/lib/policy/types";
import type { ChangeSet } from "@/lib/changeset/types";
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
            {executing ? (
              <>
                <LoaderIcon className="size-3.5 animate-spin" />
                Executing...
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
