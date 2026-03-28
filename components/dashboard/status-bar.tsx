"use client";

import { useState, useCallback, createContext, useContext, useMemo, type ReactNode } from "react";
// ActivityIcon removed — replaced with live dot indicator

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

// ── Status bar content (embeddable, no wrapper) ─────────────────────

export function StatusBarContent() {
  const { stats } = useStatusBar();

  return (
    <>
      <span className="flex items-center gap-1.5">
        <span className="relative flex size-1.5">
          <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
        </span>
        <span className="font-medium">Session</span>
      </span>
      <span className="rounded-full bg-muted px-1.5 py-0.5 tabular-nums">
        {stats.changesets} changeset{stats.changesets !== 1 ? "s" : ""}
      </span>
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

// ── Standalone status bar (legacy, kept for backwards compatibility) ──

export function StatusBar() {
  return (
    <div className="flex h-7 items-center gap-2 border-b bg-muted/20 pl-[calc(env(safe-area-inset-left,0px)+3.5rem)] pr-[calc(env(safe-area-inset-right,0px)+1rem)] text-[11px] text-muted-foreground md:pl-4 md:pr-4">
      <StatusBarContent />
    </div>
  );
}
