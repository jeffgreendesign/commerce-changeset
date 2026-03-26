"use client";

import { useState, useCallback, createContext, useContext, useMemo, type ReactNode } from "react";
import { ActivityIcon } from "lucide-react";

// ── Stats context — allows chat.tsx to push stats up ─────────────────

interface SessionStats {
  changesets: number;
  operations: number;
  failures: number;
}

interface StatusBarContextValue {
  stats: SessionStats;
  recordChangeset: (opCount: number, failCount: number) => void;
}

const StatusBarContext = createContext<StatusBarContextValue | null>(null);

export function useStatusBar() {
  const ctx = useContext(StatusBarContext);
  if (!ctx) throw new Error("useStatusBar must be used inside <StatusBarProvider>");
  return ctx;
}

export function StatusBarProvider({ children }: { children: ReactNode }) {
  const [stats, setStats] = useState<SessionStats>({
    changesets: 0,
    operations: 0,
    failures: 0,
  });

  const recordChangeset = useCallback((opCount: number, failCount: number) => {
    setStats((prev) => ({
      changesets: prev.changesets + 1,
      operations: prev.operations + opCount,
      failures: prev.failures + failCount,
    }));
  }, []);

  const value = useMemo(
    () => ({ stats, recordChangeset }),
    [stats, recordChangeset],
  );

  return (
    <StatusBarContext.Provider value={value}>
      {children}
    </StatusBarContext.Provider>
  );
}

// ── Status bar visual ────────────────────────────────────────────────

export function StatusBar() {
  const { stats } = useStatusBar();

  return (
    <div className="flex h-7 items-center gap-4 border-b bg-muted/30 px-4 text-[11px] text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <ActivityIcon className="size-3" />
        <span className="font-medium">Session</span>
      </span>
      <span>
        {stats.changesets} changeset{stats.changesets !== 1 ? "s" : ""}
      </span>
      <span className="hidden sm:inline">
        {stats.operations} operation{stats.operations !== 1 ? "s" : ""} executed
      </span>
      {stats.failures > 0 && (
        <span className="text-destructive">
          {stats.failures} failure{stats.failures !== 1 ? "s" : ""}
        </span>
      )}
      {stats.failures === 0 && stats.changesets > 0 && (
        <span className="text-emerald-600 dark:text-emerald-400">
          0 failures
        </span>
      )}
    </div>
  );
}
