"use client";

import { LayersIcon, PlayIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RiskTier } from "@/lib/policy/types";
import { useWorkspace } from "./workspace-provider";
import { cn } from "@/lib/utils";

const TIER_LABEL: Record<number, { label: string; className: string }> = {
  [RiskTier.READ]: {
    label: "Read",
    className: "text-emerald-600 dark:text-emerald-400",
  },
  [RiskTier.NOTIFY]: {
    label: "Notify",
    className: "text-blue-600 dark:text-blue-400",
  },
  [RiskTier.WRITE]: {
    label: "Write",
    className: "text-amber-600 dark:text-amber-400",
  },
  [RiskTier.BULK]: {
    label: "Bulk",
    className: "text-red-600 dark:text-red-400",
  },
};

export function DraftsView() {
  const { draftChangeset, phase, executeChangeset, cancelDraft, executionError } =
    useWorkspace();

  if (!draftChangeset) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <LayersIcon className="size-8 text-muted-foreground/40" />
        <div>
          <p className="text-sm font-medium">No drafts</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Submit an intent from the workspace to create a draft changeset.
          </p>
        </div>
      </div>
    );
  }

  const opCount = draftChangeset.operations.length;
  const maxTier =
    typeof draftChangeset.riskSummary?.maxTier === "number"
      ? draftChangeset.riskSummary.maxTier
      : RiskTier.READ;
  const tierInfo = TIER_LABEL[maxTier] ?? {
    label: `Tier ${maxTier}`,
    className: "text-muted-foreground",
  };
  const isExecuting = phase === "executing";

  return (
    <div className="flex flex-1 flex-col overflow-auto">
      <div className="border-b px-4 py-3 sm:px-6">
        <h2 className="text-sm font-semibold">Drafts</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Pending changesets ready for review
        </p>
      </div>

      <div className="p-4 sm:px-6">
        <div className="rounded-lg border bg-card p-4">
          {/* Status pill */}
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                phase === "error"
                  ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
              )}
            >
              {phase === "executing"
                ? "Executing"
                : phase === "complete"
                  ? "Complete"
                  : phase === "error"
                    ? "Error"
                    : "Draft"}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {draftChangeset.id.slice(0, 8)}
            </span>
          </div>

          {/* Prompt */}
          <p className="mt-2 text-sm font-medium leading-snug">
            &ldquo;{draftChangeset.originalPrompt}&rdquo;
          </p>

          {/* Stats */}
          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
            <span>
              {opCount} operation{opCount !== 1 ? "s" : ""}
            </span>
            <span className={cn("font-medium", tierInfo.className)}>
              {tierInfo.label} risk
            </span>
            {draftChangeset.riskSummary?.requiresCIBA && (
              <span className="text-amber-600 dark:text-amber-400">
                Approval required
              </span>
            )}
          </div>

          {/* Operations list */}
          {draftChangeset.operations.length > 0 && (
            <ul className="mt-3 space-y-1.5 border-t pt-3">
              {draftChangeset.operations.map((op) => (
                <li
                  key={op.id}
                  className="flex items-center gap-2 text-xs text-muted-foreground"
                >
                  <span className="font-mono">{op.target}</span>
                  <span className="text-muted-foreground/50">&middot;</span>
                  <span>{op.action}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Error message */}
          {phase === "error" && executionError && (
            <p className="mt-2 text-xs text-destructive">{executionError}</p>
          )}

          {/* Actions — visible during preview and error (retry) */}
          {(phase === "preview" || phase === "error") && (
            <div className="mt-3 flex items-center gap-2 border-t pt-3">
              <Button
                variant="ghost"
                size="sm"
                className="min-h-[36px] gap-1"
                onClick={cancelDraft}
              >
                <XIcon className="size-3.5" />
                Discard
              </Button>
              <Button
                variant="default"
                size="sm"
                className={cn("min-h-[36px] gap-1", !isExecuting && "animate-cta-pulse")}
                onClick={() => executeChangeset()}
                disabled={isExecuting}
              >
                <PlayIcon className="size-3.5" />
                {phase === "error" ? "Retry" : "Execute"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
