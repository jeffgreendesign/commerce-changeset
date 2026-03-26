import { AgentTraceCard, type AgentTraceData } from "./agent-trace-card";
import { cn } from "@/lib/utils";
import type { OperationResult } from "@/lib/changeset/types";

// ── Types ────────────────────────────────────────────────────────────

type ChatPhase =
  | "idle"
  | "loading"
  | "draft"
  | "executing"
  | "rolling_back"
  | "complete"
  | "error";

interface AgentActivityProps {
  phase: ChatPhase;
  requiresCIBA: boolean;
  operationCount: number;
  /** Actual execution results — used to build accurate "complete" traces. */
  results?: OperationResult[];
}

// ── Build simulated agent traces from phase ──────────────────────────

function buildTraces(
  phase: ChatPhase,
  requiresCIBA: boolean,
  operationCount: number,
  results?: OperationResult[],
): AgentTraceData[] {
  const traces: AgentTraceData[] = [];

  if (phase === "loading") {
    // During loading, Reader is active, Orchestrator is decomposing
    traces.push({
      agent: "reader",
      status: "running",
      statusLabel: "Gathering data",
      toolCalls: [
        { name: "get_products", status: "running" },
        { name: "get_launch_schedule", status: "running" },
      ],
      contextBoundary: "read-only product catalog",
    });
  }

  if (phase === "draft" || phase === "executing" || phase === "complete") {
    // Reader completed
    traces.push({
      agent: "reader",
      status: "completed",
      toolCalls: [
        { name: "get_products", status: "completed", durationMs: 847 },
        { name: "get_launch_schedule", status: "completed", durationMs: 312 },
      ],
      durationMs: 1200,
      contextBoundary: "read-only product catalog",
    });
  }

  if (phase === "executing") {
    // Writer is blocked on CIBA or executing
    const writerToolCalls = requiresCIBA
      ? []
      : Array.from({ length: operationCount }, (_, i) => ({
          name: `operation_${i + 1}`,
          status: "running" as const,
        }));

    traces.push({
      agent: "writer",
      status: requiresCIBA ? "blocked" : "running",
      statusLabel: requiresCIBA ? "Awaiting Guardian" : "Executing",
      toolCalls: writerToolCalls,
      contextBoundary: "approved change set operations only",
    });
  }

  if (phase === "rolling_back") {
    // Rollback writer
    traces.push({
      agent: "reader",
      status: "completed",
      toolCalls: [
        { name: "get_products", status: "completed", durationMs: 847 },
      ],
      durationMs: 900,
      contextBoundary: "read-only product catalog",
    });
    traces.push({
      agent: "writer",
      status: requiresCIBA ? "blocked" : "running",
      statusLabel: requiresCIBA ? "Awaiting Guardian" : "Reversing",
      toolCalls: requiresCIBA
        ? []
        : [{ name: "rollback_operations", status: "running" as const }],
      contextBoundary: "approved rollback operations only",
    });
  }

  if (phase === "complete") {
    // Writer completed — derive from actual results when available
    const STATUS_MAP = {
      success: "completed",
      failure: "failed",
      skipped: "skipped",
    } as const;

    const writerToolCalls = results
      ? results.map((r) => ({
          name: r.operationId,
          status: STATUS_MAP[r.status],
          durationMs: r.duration,
        }))
      : Array.from({ length: operationCount }, (_, i) => ({
          name: `operation_${i + 1}`,
          status: "completed" as const,
          durationMs: undefined,
        }));

    const writerDuration = results
      ? results.reduce((sum, r) => sum + r.duration, 0)
      : undefined;

    const hasFailed = results?.some((r) => r.status === "failure");

    traces.push({
      agent: "writer",
      status: hasFailed ? "failed" : "completed",
      toolCalls: writerToolCalls,
      durationMs: writerDuration,
      contextBoundary: "approved change set operations only",
    });

    // Notifier — only for forward executions with operations
    if (operationCount > 0 && !hasFailed) {
      traces.push({
        agent: "notifier",
        status: "completed",
        toolCalls: [
          {
            name: "send_launch_notification",
            status: "completed",
          },
          {
            name: "send_execution_receipt",
            status: "completed",
          },
        ],
        contextBoundary: "notification scope",
      });
    }
  }

  return traces;
}

// ── Component ────────────────────────────────────────────────────────

export function AgentActivity({
  phase,
  requiresCIBA,
  operationCount,
  results,
}: AgentActivityProps) {
  const traces = buildTraces(phase, requiresCIBA, operationCount, results);

  if (traces.length === 0) return null;

  const isActive =
    phase === "loading" || phase === "executing" || phase === "rolling_back";

  return (
    <div className="rounded-lg border bg-card/50 p-3">
      {/* Header */}
      <div className="mb-2 flex items-center gap-2">
        {isActive && (
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-blue-400 opacity-75 dark:bg-blue-500" />
            <span className="relative inline-flex size-2 rounded-full bg-blue-500 dark:bg-blue-400" />
          </span>
        )}
        <span
          className={cn(
            "text-xs font-semibold uppercase tracking-wider",
            isActive
              ? "text-foreground"
              : "text-muted-foreground",
          )}
        >
          {isActive ? "Orchestrator is running" : "Agent activity"}
        </span>
      </div>

      {/* Agent trace cards */}
      <div className="space-y-2">
        {traces.map((trace, i) => (
          <AgentTraceCard key={`${trace.agent}-${i}`} trace={trace} />
        ))}
      </div>
    </div>
  );
}
