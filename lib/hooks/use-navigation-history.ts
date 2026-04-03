"use client";

import { useEffect, useCallback, useRef } from "react";

// ── Types ────────────────────────────────────────────────────────────

type ActiveView = "chat" | "history" | "actions" | "workspace" | "drafts" | "timeline" | "activity";

interface DashboardHistoryState {
  __dashboard: true;
  activeView: ActiveView;
  activeChatId: string;
}

function isDashboardState(state: unknown): state is DashboardHistoryState {
  return (
    typeof state === "object" &&
    state !== null &&
    (state as DashboardHistoryState).__dashboard === true
  );
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

  // Seed the initial history entry on mount.
  useEffect(() => {
    const initial: DashboardHistoryState = {
      __dashboard: true,
      activeView,
      activeChatId,
    };
    window.history.replaceState(initial, "");
    // Only run on mount — intentionally omitting deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for back / forward navigation.
  useEffect(() => {
    function onPopState(event: PopStateEvent) {
      if (!isDashboardState(event.state)) return;

      isPopping.current = true;
      setActiveView(event.state.activeView);
      setActiveChatId(event.state.activeChatId);

      // Reset after a microtask so the synchronous state updates settle.
      queueMicrotask(() => {
        isPopping.current = false;
      });
    }

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [setActiveView, setActiveChatId]);

  const pushView = useCallback(
    (view: ActiveView, chatId?: string) => {
      const resolvedChatId = chatId ?? activeChatId;

      // Skip if this was triggered by a popstate handler.
      if (isPopping.current) return;

      // Deduplicate — don't push if already at the same view + chat.
      const current = window.history.state as unknown;
      if (
        isDashboardState(current) &&
        current.activeView === view &&
        current.activeChatId === resolvedChatId
      ) {
        return;
      }

      const entry: DashboardHistoryState = {
        __dashboard: true,
        activeView: view,
        activeChatId: resolvedChatId,
      };
      window.history.pushState(entry, "");
    },
    [activeChatId],
  );

  return { pushView };
}
