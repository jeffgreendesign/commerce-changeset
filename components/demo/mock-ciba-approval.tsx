"use client";

import { useState, useCallback } from "react";
import { ShieldCheckIcon, XIcon, SmartphoneIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MockCIBAApprovalProps {
  operationCount: number;
  targets: string[];
  onApprove: () => void;
  onDeny: () => void;
}

/**
 * Mock Guardian push notification — inline fake phone frame that simulates
 * the CIBA approval flow. In production, this is a real push to the user's
 * enrolled device via Auth0 Guardian.
 */
export function MockCIBAApproval({
  operationCount,
  targets,
  onApprove,
  onDeny,
}: MockCIBAApprovalProps) {
  const [approving, setApproving] = useState(false);

  const handleApprove = useCallback(() => {
    setApproving(true);
    // Simulate Guardian approval processing delay
    setTimeout(() => {
      onApprove();
    }, 1500);
  }, [onApprove]);

  const displayTargets = targets.slice(0, 3);
  const remaining = targets.length - 3;

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      {/* Phone frame */}
      <div className="w-72 rounded-[2rem] border-2 border-zinc-300 bg-zinc-100 p-3 shadow-xl dark:border-zinc-600 dark:bg-zinc-800">
        {/* Status bar */}
        <div className="mb-2 flex items-center justify-between px-4 pt-1 text-[10px] text-zinc-500 dark:text-zinc-400">
          <span>9:41</span>
          <div className="h-5 w-20 rounded-full bg-zinc-900 dark:bg-zinc-100" />
          <span>100%</span>
        </div>

        {/* Notification card */}
        <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-900">
          {/* App header */}
          <div className="mb-3 flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/50">
              <ShieldCheckIcon className="size-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Auth0 Guardian
              </p>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                Commerce Changeset
              </p>
            </div>
          </div>

          {/* Approval message */}
          <p className="mb-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Approve {operationCount} operation{operationCount !== 1 ? "s" : ""}?
          </p>
          <div className="mb-3 space-y-0.5">
            {displayTargets.map((target) => (
              <p
                key={target}
                className="text-xs text-zinc-600 dark:text-zinc-400"
              >
                {target}
              </p>
            ))}
            {remaining > 0 && (
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                +{remaining} more
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleApprove}
              disabled={approving}
              className="h-9 flex-1 rounded-xl bg-emerald-600 text-xs font-medium text-white hover:bg-emerald-500"
            >
              {approving ? (
                <span className="flex items-center gap-1.5">
                  <span className="size-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Approving...
                </span>
              ) : (
                "Approve"
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onDeny}
              disabled={approving}
              className="h-9 flex-1 rounded-xl text-xs"
            >
              <XIcon className="mr-1 size-3" />
              Deny
            </Button>
          </div>
        </div>
      </div>

      {/* Demo annotation */}
      <div className="flex items-start gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 dark:border-indigo-900 dark:bg-indigo-950/50">
        <SmartphoneIcon className="mt-0.5 size-3.5 shrink-0 text-indigo-500" />
        <p className="text-xs leading-relaxed text-indigo-700 dark:text-indigo-300">
          In production, this is a real Guardian push notification on your
          enrolled device via Auth0 CIBA.
        </p>
      </div>
    </div>
  );
}
