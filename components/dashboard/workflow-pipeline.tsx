"use client";

import { cn } from "@/lib/utils";
import {
  CheckIcon,
  CircleIcon,
  XIcon,
  Loader2Icon,
} from "lucide-react";

// ── Pipeline step definitions ────────────────────────────────────────

export type PipelineStepId =
  | "gather"
  | "analyze"
  | "draft"
  | "approve"
  | "execute"
  | "verify"
  | "done";

export type StepStatus = "pending" | "active" | "completed" | "failed";

export interface PipelineStep {
  id: PipelineStepId;
  label: string;
  status: StepStatus;
}

const STEP_LABELS: Record<PipelineStepId, string> = {
  gather: "Gather",
  analyze: "Analyze",
  draft: "Draft",
  approve: "Approve",
  execute: "Execute",
  verify: "Verify",
  done: "Done",
};

// ── Map chat Phase → pipeline steps ──────────────────────────────────

type ChatPhase =
  | "idle"
  | "loading"
  | "draft"
  | "executing"
  | "rolling_back"
  | "complete"
  | "error";

export function buildPipelineSteps(
  phase: ChatPhase,
  requiresCIBA: boolean,
): PipelineStep[] {
  const ids: PipelineStepId[] = requiresCIBA
    ? ["gather", "analyze", "draft", "approve", "execute", "verify", "done"]
    : ["gather", "analyze", "draft", "execute", "verify", "done"];

  return ids.map((id) => ({
    id,
    label: STEP_LABELS[id],
    status: getStepStatus(id, phase, requiresCIBA),
  }));
}

function getStepStatus(
  step: PipelineStepId,
  phase: ChatPhase,
  requiresCIBA: boolean,
): StepStatus {
  // Phase ordering for mapping
  const phaseOrder: Record<ChatPhase, number> = {
    idle: -1,
    loading: 1, // gather + analyze
    draft: 2,
    executing: requiresCIBA ? 4 : 3, // approve (3) then execute (4) if CIBA
    rolling_back: 5,
    complete: 6,
    error: -2,
  };

  const stepOrder: Record<PipelineStepId, number> = {
    gather: 0,
    analyze: 1,
    draft: 2,
    approve: 3,
    execute: requiresCIBA ? 4 : 3,
    verify: requiresCIBA ? 5 : 4,
    done: requiresCIBA ? 6 : 5,
  };

  const currentPhaseOrder = phaseOrder[phase];
  const thisStepOrder = stepOrder[step];

  if (phase === "error") {
    // Mark the currently-active step as failed, prior steps as completed
    // Determine what step the error likely occurred at
    const errorStepOrder =
      phase === "error"
        ? // error could happen at any active step — use loading→gather, executing→execute, etc.
          phaseOrder.loading // fallback; we refine below
        : currentPhaseOrder;

    // We don't track exactly which step errored, so show all prior as done
    // and the last active as failed
    if (thisStepOrder < errorStepOrder) return "completed";
    if (thisStepOrder === errorStepOrder) return "failed";
    return "pending";
  }

  if (phase === "idle") return "pending";

  if (thisStepOrder < currentPhaseOrder) return "completed";
  if (thisStepOrder === currentPhaseOrder) return "active";
  return "pending";
}

// ── Step icon ────────────────────────────────────────────────────────

function StepIcon({ status }: { status: StepStatus }) {
  switch (status) {
    case "completed":
      return (
        <div className="flex size-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 animate-step-enter dark:bg-emerald-900/40 dark:text-emerald-400">
          <CheckIcon className="size-3.5" />
        </div>
      );
    case "active":
      return (
        <div className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground animate-pulse-glow">
          <Loader2Icon className="size-3.5 animate-spin" />
        </div>
      );
    case "failed":
      return (
        <div className="flex size-6 items-center justify-center rounded-full bg-destructive/10 text-destructive animate-step-enter">
          <XIcon className="size-3.5" />
        </div>
      );
    default:
      return (
        <div className="flex size-6 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <CircleIcon className="size-2.5" />
        </div>
      );
  }
}

// ── Connector line between steps ─────────────────────────────────────

function Connector({
  fromStatus,
  orientation,
}: {
  fromStatus: StepStatus;
  orientation: "horizontal" | "vertical";
}) {
  const filled = fromStatus === "completed";

  if (orientation === "vertical") {
    return (
      <div className="flex justify-center py-0.5">
        <div
          className={cn(
            "w-px transition-colors duration-300",
            filled ? "bg-emerald-500 dark:bg-emerald-400" : "bg-border",
            "h-4",
          )}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center px-1">
      <div
        className={cn(
          "h-px w-full transition-colors duration-300",
          filled ? "bg-emerald-500 dark:bg-emerald-400" : "bg-border",
        )}
      />
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────

interface WorkflowPipelineProps {
  phase: ChatPhase;
  requiresCIBA: boolean;
}

export function WorkflowPipeline({ phase, requiresCIBA }: WorkflowPipelineProps) {
  const steps = buildPipelineSteps(phase, requiresCIBA);

  // Don't render in idle state
  if (phase === "idle") return null;

  return (
    <div className="rounded-lg border bg-card p-3">
      {/* Horizontal layout (md+) */}
      <div className="hidden items-center md:flex">
        {steps.map((step, i) => (
          <div key={step.id} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1">
              <StepIcon status={step.status} />
              <span
                className={cn(
                  "text-[10px] font-medium transition-colors",
                  step.status === "active" && "text-foreground",
                  step.status === "completed" &&
                    "text-emerald-700 dark:text-emerald-400",
                  step.status === "failed" && "text-destructive",
                  step.status === "pending" && "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <Connector fromStatus={step.status} orientation="horizontal" />
            )}
          </div>
        ))}
      </div>

      {/* Vertical layout (< md) */}
      <div className="flex flex-col md:hidden">
        {steps.map((step, i) => (
          <div key={step.id}>
            <div className="flex items-center gap-3">
              <StepIcon status={step.status} />
              <span
                className={cn(
                  "text-xs font-medium transition-colors",
                  step.status === "active" && "text-foreground",
                  step.status === "completed" &&
                    "text-emerald-700 dark:text-emerald-400",
                  step.status === "failed" && "text-destructive",
                  step.status === "pending" && "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="ml-[11px]">
                <Connector fromStatus={step.status} orientation="vertical" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
