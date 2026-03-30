"use client";

import { useState, useMemo } from "react";
import {
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  CircleDotIcon,
  ChevronRightIcon,
  TagIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { RiskTier } from "@/lib/policy/types";
import type { ChangeSet, OperationDiff } from "@/lib/changeset/types";
import { useWorkspace } from "./workspace-provider";

// ── Tier display config ────────────────────────────────────────────

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

// ── Snapshot type ──────────────────────────────────────────────────

interface TimelineEntry {
  changeset: ChangeSet;
  completedAt: string;
}

// ── Component ──────────────────────────────────────────────────────

export function TimelineView() {
  const { draftChangeset, phase } = useWorkspace();
  const [history, setHistory] = useState<TimelineEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<TimelineEntry | null>(
    null,
  );
  const [prevPhase, setPrevPhase] = useState(phase);

  // Capture completed changesets into history on phase transition.
  // Uses the "setState during render" pattern (React-endorsed alternative
  // to effects for derived state) to avoid the lint rules for both
  // "setState in effect" and "refs during render".
  if (phase !== prevPhase) {
    setPrevPhase(phase);
    if (prevPhase === "executing" && phase === "complete" && draftChangeset) {
      setHistory((prev) => [
        ...prev,
        {
          changeset: { ...draftChangeset, status: "completed" as const },
          completedAt: new Date().toISOString(),
        },
      ]);
    }
  }

  // Build the full list: history + current draft (if any)
  const entries = useMemo(() => {
    const all: TimelineEntry[] = [...history];
    if (draftChangeset && phase !== "idle" && phase !== "complete") {
      all.push({
        changeset: draftChangeset,
        completedAt: "",
      });
    }
    return all;
  }, [history, draftChangeset, phase]);

  const isEmpty = entries.length === 0;

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      {/* Header */}
      <div className="border-b px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <ClockIcon className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Timeline</h2>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Changeset history for this session
        </p>
      </div>

      {isEmpty ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <ClockIcon className="size-10 text-muted-foreground/30" />
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              No changeset history yet
            </p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground/70">
              Executed changesets will appear here as a timeline. Use the
              workspace to create and execute changes.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          {/* Timeline list */}
          <ScrollArea className="border-b md:w-80 md:border-b-0 md:border-r">
            <div className="p-3 space-y-1">
              {entries.map((entry, i) => {
                const cs = entry.changeset;
                const isCompleted = cs.status === "completed";
                const isError = cs.status === "partial_failure";
                const isDraft =
                  cs.status === "draft" ||
                  cs.status === "pending_approval" ||
                  cs.status === "executing";
                const isSelected = selectedEntry?.changeset.id === cs.id;

                const tierConfig = TIER_CONFIG[
                  cs.riskSummary?.maxTier ?? RiskTier.READ
                ] ?? {
                  label: "Unknown",
                  className: "bg-muted text-muted-foreground",
                };

                return (
                  <button
                    key={`${cs.id}-${i}`}
                    type="button"
                    onClick={() => setSelectedEntry(entry)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors min-h-[44px]",
                      isSelected
                        ? "bg-accent"
                        : "hover:bg-muted/50",
                    )}
                  >
                    {/* Status icon */}
                    <div className="mt-0.5 shrink-0">
                      {isCompleted ? (
                        <CheckCircleIcon className="size-4 text-emerald-500" />
                      ) : isError ? (
                        <XCircleIcon className="size-4 text-red-500" />
                      ) : (
                        <CircleDotIcon className="size-4 text-amber-500 animate-pulse" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium leading-tight line-clamp-2">
                        &ldquo;{cs.originalPrompt}&rdquo;
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                        <span>
                          {cs.operations.length} op
                          {cs.operations.length !== 1 ? "s" : ""}
                        </span>
                        <span>&middot;</span>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-1.5 py-0 font-medium",
                            tierConfig.className,
                          )}
                        >
                          {tierConfig.label}
                        </span>
                        {entry.completedAt && (
                          <>
                            <span>&middot;</span>
                            <span>
                              {new Date(entry.completedAt).toLocaleTimeString(
                                [],
                                { hour: "2-digit", minute: "2-digit" },
                              )}
                            </span>
                          </>
                        )}
                        {isDraft && (
                          <Badge
                            variant="secondary"
                            className="ml-auto text-[9px] px-1 py-0"
                          >
                            {cs.status === "executing"
                              ? "Executing"
                              : "Draft"}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <ChevronRightIcon className="mt-1 size-3.5 shrink-0 text-muted-foreground/50" />
                  </button>
                );
              })}
            </div>
          </ScrollArea>

          {/* Detail panel */}
          <div className="flex-1 overflow-auto">
            {selectedEntry ? (
              <TimelineDetail entry={selectedEntry} />
            ) : (
              <div className="flex h-full items-center justify-center p-8 text-center">
                <p className="text-xs text-muted-foreground">
                  Select an entry to view details
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Detail view ────────────────────────────────────────────────────

function TimelineDetail({ entry }: { entry: TimelineEntry }) {
  const cs = entry.changeset;

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-4 sm:p-6">
        {/* Header */}
        <div>
          <p className="text-xs text-muted-foreground font-mono">
            {cs.id}
          </p>
          <p className="mt-1 text-sm font-medium">
            &ldquo;{cs.originalPrompt}&rdquo;
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary" className="text-[10px] capitalize">
              {cs.status.replace(/_/g, " ")}
            </Badge>
            {entry.completedAt && (
              <span>
                {new Date(entry.completedAt).toLocaleString()}
              </span>
            )}
            <span>
              {cs.operations.length} operation
              {cs.operations.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <Separator />

        {/* Operations */}
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Operations
          </p>
          <div className="space-y-2">
            {cs.operations.map((op) => {
              const tierCfg = TIER_CONFIG[op.tier] ?? {
                label: `Tier ${op.tier}`,
                className: "bg-muted text-muted-foreground",
              };
              return (
                <div
                  key={op.id}
                  className="rounded-lg border p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold">
                        {op.action}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {op.target}
                      </span>
                    </div>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                        tierCfg.className,
                      )}
                    >
                      {tierCfg.label}
                    </span>
                  </div>

                  {/* Diffs */}
                  {Array.isArray(op.diff) && op.diff.length > 0 && (
                    <div className="space-y-1">
                      {op.diff.map((d: OperationDiff, i: number) => (
                        <div
                          key={i}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="font-medium text-muted-foreground">
                            {d.field}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-red-600 line-through dark:text-red-400">
                              {String(d.before)}
                            </span>
                            <TagIcon className="size-3 text-muted-foreground" />
                            <span className="text-emerald-600 dark:text-emerald-400">
                              {String(d.after)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Execution receipt */}
        {cs.execution?.receipt && (
          <>
            <Separator />
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Execution Receipt
              </p>
              <div className="rounded-md bg-muted/50 p-3 text-[11px] space-y-1">
                <p>
                  <span className="font-medium">Executed by:</span>{" "}
                  {cs.execution.receipt.executedBy}
                </p>
                <p>
                  <span className="font-medium">At:</span>{" "}
                  {new Date(cs.execution.receipt.executedAt).toLocaleString()}
                </p>
                {cs.execution.receipt.verification && (
                  <p>
                    <span className="font-medium">Checks:</span>{" "}
                    {cs.execution.receipt.verification.checksPassed}/
                    {cs.execution.receipt.verification.checksRun} passed
                  </p>
                )}
                <p className="break-all">
                  <span className="font-medium">Audit hash:</span>{" "}
                  <code className="font-mono text-[10px]">
                    {cs.execution.receipt.auditHash}
                  </code>
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </ScrollArea>
  );
}
