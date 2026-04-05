"use client";

import { useEffect, useState } from "react";
import { CheckCircle2Icon, ShieldCheckIcon, SmartphoneIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface CIBAApprovalGateProps {
  /** Max timeout in seconds for the CIBA approval. */
  timeoutSeconds?: number;
  /** Whether this is a rollback approval. */
  isRollback?: boolean;
  /** Whether the CIBA approval has been granted. Triggers approved visual state. */
  approved?: boolean;
}

export function CIBAApprovalGate({
  timeoutSeconds = 120,
  isRollback = false,
  approved = false,
}: CIBAApprovalGateProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (approved) return; // Stop ticking once approved
    const interval = setInterval(() => {
      setElapsed((prev) => {
        if (prev >= timeoutSeconds) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timeoutSeconds, approved]);

  const remaining = Math.max(0, timeoutSeconds - elapsed);
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const progress = approved ? 100 : (elapsed / timeoutSeconds) * 100;

  return (
    <div
      className={cn(
        "rounded-lg border p-4 transition-colors duration-500",
        approved
          ? "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40"
          : "border-border bg-card",
      )}
    >
      {/* Progress bar at top */}
      <div className="mb-4 h-1 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-linear",
            approved
              ? "bg-emerald-500 dark:bg-emerald-400"
              : "bg-violet-500 dark:bg-violet-400",
          )}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
        {/* Icon — phone (pending) or checkmark (approved) */}
        <div className="relative flex-shrink-0">
          <div
            className={cn(
              "flex size-12 items-center justify-center rounded-xl transition-colors duration-500",
              approved
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                : "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400",
            )}
          >
            {approved ? (
              <CheckCircle2Icon className="size-6 animate-in zoom-in-50 duration-300" />
            ) : (
              <SmartphoneIcon className="size-6" />
            )}
          </div>
          {!approved && (
            <div
              className="absolute -inset-1 rounded-xl border-2 border-violet-400/50 animate-ping dark:border-violet-500/40"
              style={{ animationDuration: "2s" }}
            />
          )}
        </div>

        {/* Text */}
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-center gap-2 sm:justify-start">
            <ShieldCheckIcon
              className={cn(
                "size-4 transition-colors duration-500",
                approved
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-violet-600 dark:text-violet-400",
              )}
            />
            <h3 className="text-sm font-semibold">
              {approved
                ? "Guardian Approval Granted"
                : isRollback
                  ? "Guardian Approval Required for Rollback"
                  : "Guardian Approval Required"}
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            {approved
              ? "Authorization confirmed. Executing operations..."
              : "Approve the pending request on your Auth0 Guardian app to continue."}
          </p>
        </div>

        {/* Countdown or approved badge */}
        <div className="flex flex-col items-center gap-0.5">
          {approved ? (
            <span className="font-mono text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              Approved
            </span>
          ) : (
            <>
              <span className="font-mono text-lg font-semibold tabular-nums text-foreground">
                {minutes}:{seconds.toString().padStart(2, "0")}
              </span>
              <span className="text-[10px] text-muted-foreground">remaining</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
