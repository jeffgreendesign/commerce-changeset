"use client";

import { cn } from "@/lib/utils";
import {
  CheckIcon,
  Loader2Icon,
  AlertCircleIcon,
  MinusCircleIcon,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────

export type ToolCallStatus = "running" | "completed" | "failed" | "skipped";

export interface ToolCallData {
  name: string;
  status: ToolCallStatus;
  durationMs?: number;
}

// ── Component ────────────────────────────────────────────────────────

export function ToolCallRow({ call }: { call: ToolCallData }) {
  return (
    <div className="flex items-center gap-2 py-0.5 text-xs">
      {/* Status icon */}
      {call.status === "running" && (
        <Loader2Icon className="size-3 shrink-0 animate-spin text-muted-foreground" />
      )}
      {call.status === "completed" && (
        <CheckIcon className="size-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
      )}
      {call.status === "failed" && (
        <AlertCircleIcon className="size-3 shrink-0 text-destructive" />
      )}
      {call.status === "skipped" && (
        <MinusCircleIcon className="size-3 shrink-0 text-muted-foreground" />
      )}

      {/* Tool name */}
      <code
        className={cn(
          "font-mono text-[11px]",
          call.status === "completed" && "text-muted-foreground",
          call.status === "running" && "text-foreground",
          call.status === "failed" && "text-destructive",
          call.status === "skipped" && "text-muted-foreground line-through",
        )}
      >
        {call.name}()
      </code>

      {/* Duration */}
      {call.durationMs !== undefined && (
        <span className="ml-auto tabular-nums text-[10px] text-muted-foreground">
          {call.durationMs}ms
        </span>
      )}
    </div>
  );
}
