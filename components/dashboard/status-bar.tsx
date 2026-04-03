"use client";

import { useMemo, type ReactNode } from "react";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { useLayout } from "@/components/dashboard/layout-shell";

// ── Derive stats from workspace timeline history ────────────────────

interface SessionStats {
  changesets: number;
  operations: number;
  failures: number;
}

function useSessionStats(): SessionStats {
  const { changesetHistory, sessionStart } = useWorkspace();
  return useMemo(() => {
    let operations = 0;
    let failures = 0;
    let changesets = 0;
    for (const entry of changesetHistory) {
      if (entry.completedAt < sessionStart) continue;
      changesets += 1;
      operations += entry.changeset.operations.length;
      if (entry.changeset.status === "partial_failure") {
        failures += 1;
      }
    }
    return { changesets, operations, failures };
  }, [changesetHistory, sessionStart]);
}

// ── Status bar content (embeddable, no wrapper) ─────────────────────

export function StatusBarContent() {
  const stats = useSessionStats();
  const { setActiveView } = useLayout();

  return (
    <>
      <span className="flex items-center gap-1.5">
        <span className="relative flex size-1.5">
          <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
        </span>
        <span className="font-medium">Session</span>
      </span>
      <button
        type="button"
        onClick={() => setActiveView("timeline")}
        className="rounded-full bg-muted px-1.5 py-0.5 tabular-nums transition-colors hover:bg-muted/80 hover:text-foreground"
      >
        {stats.changesets} changeset{stats.changesets !== 1 ? "s" : ""}
      </button>
      <span className="hidden rounded-full bg-muted px-1.5 py-0.5 tabular-nums sm:inline">
        {stats.operations} op{stats.operations !== 1 ? "s" : ""}
      </span>
      {stats.failures > 0 && (
        <span className="rounded-full bg-red-100 px-1.5 py-0.5 tabular-nums text-red-700 dark:bg-red-900/30 dark:text-red-400">
          {stats.failures} fail{stats.failures !== 1 ? "s" : ""}
        </span>
      )}
      {stats.failures === 0 && stats.changesets > 0 && (
        <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
          0 fails
        </span>
      )}
    </>
  );
}

// ── Provider (kept for backwards compatibility — now a passthrough) ──

export function StatusBarProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
