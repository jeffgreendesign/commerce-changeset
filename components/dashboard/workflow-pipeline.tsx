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
  const phaseOrder: Record<ChatPhase, number> = {
    idle: -1,
    loading: 1,
    draft: 2,
    executing: requiresCIBA ? 4 : 3,
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
    const errorStepOrder = phaseOrder.loading;
    if (thisStepOrder < errorStepOrder) return "completed";
    if (thisStepOrder === errorStepOrder) return "failed";
    return "pending";
  }

  if (phase === "idle") return "pending";

  if (thisStepOrder < currentPhaseOrder) return "completed";
  if (thisStepOrder === currentPhaseOrder) return "active";
  return "pending";
}

// ── Step dot (compact) ───────────────────────────────────────────────

function StepDot({ status }: { status: StepStatus }) {
  switch (status) {
    case "completed":
      return (
        <div className="flex size-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 animate-step-enter dark:bg-emerald-900/40 dark:text-emerald-400 sm:size-6">
          <CheckIcon className="size-3 sm:size-3.5" />
        </div>
      );
    case "active":
      return (
        <div className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground animate-pulse-glow sm:size-6">
          <Loader2Icon className="size-3 animate-spin sm:size-3.5" />
        </div>
      );
    case "failed":
      return (
        <div className="flex size-5 items-center justify-center rounded-full bg-destructive/10 text-destructive animate-step-enter sm:size-6">
          <XIcon className="size-3 sm:size-3.5" />
        </div>
      );
    default:
      return (
        <div className="flex size-5 items-center justify-center rounded-full bg-muted text-muted-foreground sm:size-6">
          <CircleIcon className="size-2 sm:size-2.5" />
        </div>
      );
  }
}

// ── Connector line ───────────────────────────────────────────────────

function Connector({ fromStatus }: { fromStatus: StepStatus }) {
  const filled = fromStatus === "completed";
  return (
    <div className="flex flex-1 items-center px-0.5 sm:px-1">
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
  const allComplete = phase === "complete";

  if (phase === "idle") return null;

  return (
    <div
      className={cn(
        "rounded-lg border bg-card/80 px-3 py-2 backdrop-blur-sm sm:p-3",
        allComplete && "animate-shimmer-sweep",
      )}
    >
      {/* Dots + connectors row — connectors align to dot centers */}
      <div className="flex items-center">
        {steps.map((step, i) => (
          <div key={step.id} className="flex flex-1 items-center">
            <div className="flex flex-1 justify-center">
              <StepDot status={step.status} />
            </div>
            {i < steps.length - 1 && (
              <Connector fromStatus={step.status} />
            )}
          </div>
        ))}
      </div>

      {/* Labels row — matches dot positions */}
      <div className="mt-0.5 flex sm:mt-1">
        {steps.map((step, i) => (
          <div key={step.id} className="flex flex-1">
            <span
              className={cn(
                "flex-1 text-center text-[9px] font-medium leading-none transition-colors sm:text-[10px]",
                step.status === "active" && "text-foreground",
                step.status === "completed" &&
                  "text-emerald-700 dark:text-emerald-400",
                step.status === "failed" && "text-destructive",
                step.status === "pending" && "text-muted-foreground",
              )}
            >
              {step.label}
            </span>
            {/* Spacer matching connector width for non-last steps */}
            {i < steps.length - 1 && (
              <div className="flex-1 px-0.5 sm:px-1" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
