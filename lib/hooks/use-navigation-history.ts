"use client";

import { useEffect, useCallback, useRef } from "react";
import { z } from "zod";
import { ACTIVE_VIEWS, type ActiveView } from "@/lib/navigation-types";

// ── Schema ──────────────────────────────────────────────────────────

const dashboardStateSchema = z.object({
  __dashboard: z.literal(true),
  activeView: z.enum(ACTIVE_VIEWS),
  activeChatId: z.string(),
});

type DashboardHistoryState = z.infer<typeof dashboardStateSchema>;

function parseDashboardState(state: unknown): DashboardHistoryState | null {
  const result = dashboardStateSchema.safeParse(state);
  return result.success ? result.data : null;
}

// ── Hook ─────────────────────────────────────────────────────────────

interface UseNavigationHistoryParams {
  activeView: ActiveView;
  activeChatId: string;
  setActiveView: (view: ActiveView) => void;
  setActiveChatId: (id: string) => void;
}

/**
 * Syncs dashboard view navigation with the browser history stack.
 *
 * Returns `pushView` — call it instead of raw `setActiveView` to record
 * the transition in history. Back / forward buttons (and iOS Safari swipe)
 * will restore previous views automatically.
 */
export function useNavigationHistory({
  activeView,
  activeChatId,
  setActiveView,
  setActiveChatId,
}: UseNavigationHistoryParams) {
  // Track whether a popstate handler is currently updating state so we
  // don't re-push the entry we just popped.
  const isPopping = useRef(false);

  // Keep the latest activeChatId in a ref so pushView always reads
  // the current value instead of a stale closure capture.
  const chatIdRef = useRef(activeChatId);
  useEffect(() => {
    chatIdRef.current = activeChatId;
  }, [activeChatId]);

  // Seed the initial history entry on mount, preserving any existing
  // keys (e.g. Next.js internal state like PRIVATE_NEXTJS_INTERNALS_TREE).
  useEffect(() => {
    const prev = (window.history.state ?? {}) as Record<string, unknown>;
    window.history.replaceState(
      { ...prev, __dashboard: true, activeView, activeChatId },
      "",
    );
    // Only run on mount — intentionally omitting deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for back / forward navigation.
  useEffect(() => {
    function onPopState(event: PopStateEvent) {
      const parsed = parseDashboardState(event.state);
      if (!parsed) return;

      isPopping.current = true;
      setActiveView(parsed.activeView);
      setActiveChatId(parsed.activeChatId);

      // Reset after a microtask so the synchronous state updates settle.
      queueMicrotask(() => {
        isPopping.current = false;
      });
    }

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [setActiveView, setActiveChatId]);

  /**
   * Push a new view onto the browser history stack.
   *
   * Reads the latest `activeChatId` from a ref, so callers never push
   * a stale id. Pass `chatId` explicitly to override (e.g. when the
   * new id hasn't propagated to state yet, as in `startNewChat`).
   */
  const pushView = useCallback(
    (view: ActiveView, chatId?: string) => {
      const resolvedChatId = chatId ?? chatIdRef.current;

      // Skip if this was triggered by a popstate handler.
      if (isPopping.current) return;

      // Deduplicate — don't push if already at the same view + chat.
      const current = parseDashboardState(window.history.state);
      if (
        current &&
        current.activeView === view &&
        current.activeChatId === resolvedChatId
      ) {
        return;
      }

      // Shallow-merge to preserve existing keys (e.g. Next.js internals).
      const prev = (window.history.state ?? {}) as Record<string, unknown>;
      window.history.pushState(
        { ...prev, __dashboard: true, activeView: view, activeChatId: resolvedChatId },
        "",
      );
    },
    [],
  );

  return { pushView };
}
