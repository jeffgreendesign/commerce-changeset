"use client";

import { useState } from "react";
import { ChevronDownIcon, LockIcon } from "lucide-react";
import { AgentBadge } from "@/components/changeset/agent-badge";
import { Badge } from "@/components/ui/badge";
import { ToolCallRow, type ToolCallData } from "./tool-call-row";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────

export type AgentTraceStatus = "running" | "completed" | "failed" | "blocked";

export interface AgentTraceData {
  agent: string;
  status: AgentTraceStatus;
  toolCalls: ToolCallData[];
  durationMs?: number;
  contextBoundary?: string;
  statusLabel?: string;
}

// ── Status config ────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  AgentTraceStatus,
  { label: string; dotClass: string; badgeClass: string }
> = {
  running: {
    label: "Running",
    dotClass: "bg-blue-500 animate-pulse",
    badgeClass:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  completed: {
    label: "Complete",
    dotClass: "bg-emerald-500",
    badgeClass:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  failed: {
    label: "Failed",
    dotClass: "bg-red-500",
    badgeClass:
      "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
  blocked: {
    label: "Awaiting CIBA",
    dotClass: "bg-violet-500 animate-pulse",
    badgeClass:
      "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  },
};

// ── Component ────────────────────────────────────────────────────────

export function AgentTraceCard({ trace }: { trace: AgentTraceData }) {
  const [expanded, setExpanded] = useState(trace.status === "running");
  const cfg = STATUS_CONFIG[trace.status];

  return (
    <div className="rounded-md border bg-card">
      {/* Header — always visible */}
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left min-h-[44px]"
        aria-expanded={expanded}
      >
        {/* Pulsing dot */}
        <span
          className={cn("size-2 shrink-0 rounded-full", cfg.dotClass)}
        />

        <AgentBadge agent={trace.agent} />

        <Badge className={cn("border-0 text-[10px] px-1.5 py-0", cfg.badgeClass)}>
          {trace.statusLabel ?? cfg.label}
        </Badge>

        {trace.durationMs !== undefined && (
          <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">
            {(trace.durationMs / 1000).toFixed(1)}s
          </span>
        )}

        <ChevronDownIcon
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground transition-transform",
            expanded && "rotate-180",
          )}
        />
      </button>

      {/* Expandable detail */}
      {expanded && (
        <div className="border-t px-3 py-2 space-y-1">
          {/* Context boundary */}
          {trace.contextBoundary && (
            <div className="mb-1.5 flex items-center gap-1.5 rounded border border-dashed border-border/60 px-2 py-1 text-[10px] text-muted-foreground">
              <LockIcon className="size-2.5 shrink-0" />
              <span className="truncate">{trace.contextBoundary}</span>
            </div>
          )}

          {/* Tool calls */}
          {trace.toolCalls.length > 0 ? (
            trace.toolCalls.map((call, i) => (
              <ToolCallRow key={`${call.name}-${i}`} call={call} />
            ))
          ) : (
            <p className="text-[10px] text-muted-foreground italic">
              No tool calls yet
            </p>
          )}
        </div>
      )}
    </div>
  );
}
