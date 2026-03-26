"use client";

import { useEffect, useState } from "react";
import { ShieldCheckIcon, SmartphoneIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface CIBAApprovalGateProps {
  /** Max timeout in seconds for the CIBA approval. */
  timeoutSeconds?: number;
  /** Whether this is a rollback approval. */
  isRollback?: boolean;
}

export function CIBAApprovalGate({
  timeoutSeconds = 120,
  isRollback = false,
}: CIBAApprovalGateProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
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
  }, [timeoutSeconds]);

  const remaining = Math.max(0, timeoutSeconds - elapsed);
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const progress = (elapsed / timeoutSeconds) * 100;

  return (
    <div className="rounded-lg border bg-card p-4">
      {/* Progress bar at top */}
      <div className="mb-4 h-1 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-violet-500 transition-all duration-1000 ease-linear dark:bg-violet-400"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
        {/* Phone icon with pulsing ring */}
        <div className="relative flex-shrink-0">
          <div className="flex size-12 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400">
            <SmartphoneIcon className="size-6" />
          </div>
          <div
            className={cn(
              "absolute -inset-1 rounded-xl border-2 border-violet-400/50 dark:border-violet-500/40",
              "animate-ping",
            )}
            style={{ animationDuration: "2s" }}
          />
        </div>

        {/* Text */}
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-center gap-2 sm:justify-start">
            <ShieldCheckIcon className="size-4 text-violet-600 dark:text-violet-400" />
            <h3 className="text-sm font-semibold">
              {isRollback
                ? "Guardian Approval Required for Rollback"
                : "Guardian Approval Required"}
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Approve the pending request on your Auth0 Guardian app to continue.
          </p>
        </div>

        {/* Countdown */}
        <div className="flex flex-col items-center gap-0.5">
          <span className="font-mono text-lg font-semibold tabular-nums text-foreground">
            {minutes}:{seconds.toString().padStart(2, "0")}
          </span>
          <span className="text-[10px] text-muted-foreground">remaining</span>
        </div>
      </div>
    </div>
  );
}
