"use client";

import {
  useState,
  useCallback,
  useEffect,
  useRef,
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { Rail } from "./rail";
import { Inspector, type InspectableItem } from "./inspector";
import { QuickActionConfirmDialog } from "./quick-action-confirm-dialog";
import { generateChatId } from "@/lib/chat-history";
import { useNavigationHistory } from "@/lib/hooks/use-navigation-history";
import { type ActiveView } from "@/lib/navigation-types";
import type { ActionDefinition } from "@/lib/actions";

// ── Context ──────────────────────────────────────────────────────────

const WORKSPACE_VIEWS: ReadonlySet<ActiveView> = new Set(["workspace", "drafts", "timeline", "activity"]);

export function isWorkspaceView(view: ActiveView): boolean {
  return WORKSPACE_VIEWS.has(view);
}

interface LayoutContextValue {
  /** Open the right inspector panel with an item. */
  inspect: (item: InspectableItem) => void;
  /** Close the inspector. */
  closeInspector: () => void;
  /** Whether the inspector is currently open. */
  inspectorOpen: boolean;
  /** Whether the left rail is expanded (desktop only). */
  railExpanded: boolean;
  toggleRail: () => void;
  /** Currently active chat session ID. */
  activeChatId: string;
  /** Start a new chat session. */
  startNewChat: () => void;
  /** Load and switch to an existing chat session. */
  loadChat: (id: string) => void;
  /** Which view is currently active. */
  activeView: ActiveView;
  /** Switch the active view. */
  setActiveView: (view: ActiveView) => void;
  /** Pending prompt to be consumed by the chat view (set by Quick Actions). */
  pendingPrompt: string | null;
  /** Set a pending prompt and switch to chat view. */
  setPendingPrompt: (prompt: string) => void;
  /** Consume (read + clear) the pending prompt. Returns prompt or null. */
  consumePendingPrompt: () => string | null;
  /** Pending action awaiting confirmation in the dialog. */
  pendingAction: ActionDefinition | null;
  /** Show the confirmation dialog for an action. */
  setPendingAction: (action: ActionDefinition) => void;
  /** Close the confirmation dialog without running. */
  clearPendingAction: () => void;
  /** Whether the current session is a demo (mock data, no real Auth0). */
  isDemo: boolean;
}

const LayoutContext = createContext<LayoutContextValue | null>(null);

export function useLayout() {
  const ctx = useContext(LayoutContext);
  if (!ctx) throw new Error("useLayout must be used inside <LayoutShell>");
  return ctx;
}

// ── Component ────────────────────────────────────────────────────────

interface LayoutShellProps {
  children: ReactNode;
  userName: string;
  isDemo?: boolean;
  initialView?: ActiveView;
}

/**
 * Views that are only meaningful in demo mode, mapped to their fallback.
 *
 * Turn Review renders a fixed synthetic scenario (`lib/turn-review/demo-turn.ts`)
 * with no live capture behind it. Normalizing here rather than at the render
 * site keeps `activeView` itself truthful — the Rail highlights from it and
 * `Workspace` branches on it, so a stale "turn-review" would leave both in an
 * inconsistent state.
 */
const DEMO_ONLY_VIEW_FALLBACK: Partial<Record<ActiveView, ActiveView>> = {
  "turn-review": "workspace",
};

function normalizeView(view: ActiveView, isDemo: boolean): ActiveView {
  if (isDemo) return view;
  return DEMO_ONLY_VIEW_FALLBACK[view] ?? view;
}

export function LayoutShell({ children, userName, isDemo = false, initialView = "workspace" }: LayoutShellProps) {
  const [railExpanded, setRailExpanded] = useState(false);
  const [inspectorItem, setInspectorItem] = useState<InspectableItem | null>(
    null,
  );
  const [activeChatId, setActiveChatId] = useState(() => generateChatId());
  const [activeView, setActiveViewState] = useState<ActiveView>(() =>
    normalizeView(initialView, isDemo),
  );

  // Read isDemo through a ref so setActiveView keeps a stable identity. It is
  // a dependency of several downstream callbacks, and making it change with
  // isDemo would break their memoization for a prop that never changes for a
  // mounted shell.
  const isDemoRef = useRef(isDemo);
  useEffect(() => {
    isDemoRef.current = isDemo;
  }, [isDemo]);

  // Every write to activeView goes through here, including browser back/forward
  // restores, so a demo-only view can never enter state outside demo mode.
  const setActiveView = useCallback(
    (view: ActiveView) => setActiveViewState(normalizeView(view, isDemoRef.current)),
    [],
  );
  const [pendingPrompt, setPendingPromptState] = useState<string | null>(null);
  const pendingPromptRef = useRef<string | null>(null);
  const [pendingAction, setPendingActionState] = useState<ActionDefinition | null>(null);

  // Browser history integration for back/forward navigation.
  const { pushView } = useNavigationHistory({
    activeView,
    activeChatId,
    setActiveView,
    setActiveChatId,
  });

  const inspect = useCallback((item: InspectableItem) => {
    setInspectorItem(item);
  }, []);

  const closeInspector = useCallback(() => {
    setInspectorItem(null);
  }, []);

  const toggleRail = useCallback(() => {
    setRailExpanded((prev) => !prev);
  }, []);

  const startNewChat = useCallback(() => {
    const id = generateChatId();
    setActiveChatId(id);
    setActiveView("chat");
    pushView("chat", id);
  }, [pushView, setActiveView]);

  const loadChat = useCallback((id: string) => {
    setActiveChatId(id);
    setActiveView("chat");
    pushView("chat", id);
  }, [pushView, setActiveView]);

  const setPendingPrompt = useCallback((prompt: string) => {
    pendingPromptRef.current = prompt;
    setPendingPromptState(prompt);
    setActiveView("chat");
    pushView("chat");
  }, [pushView, setActiveView]);

  const consumePendingPrompt = useCallback(() => {
    const p = pendingPromptRef.current;
    if (p) {
      pendingPromptRef.current = null;
      setPendingPromptState(null);
    }
    return p;
  }, []);

  const setPendingAction = useCallback((action: ActionDefinition) => {
    setPendingActionState(action);
  }, []);

  const clearPendingAction = useCallback(() => {
    setPendingActionState(null);
  }, []);

  const confirmPendingAction = useCallback((action: ActionDefinition) => {
    setPendingActionState(null);
    setPendingPrompt(action.prompt);
  }, [setPendingPrompt]);

  // Wrap setActiveView so external consumers (Rail, etc.) push history.
  const navigateToView = useCallback((view: ActiveView) => {
    setActiveView(view);
    pushView(view);
  }, [pushView, setActiveView]);

  const ctx = useMemo<LayoutContextValue>(
    () => ({
      inspect,
      closeInspector,
      inspectorOpen: inspectorItem !== null,
      railExpanded,
      toggleRail,
      activeChatId,
      startNewChat,
      loadChat,
      activeView,
      setActiveView: navigateToView,
      pendingPrompt,
      setPendingPrompt,
      consumePendingPrompt,
      pendingAction,
      setPendingAction,
      clearPendingAction,
      isDemo,
    }),
    [inspect, closeInspector, inspectorItem, railExpanded, toggleRail, activeChatId, startNewChat, loadChat, activeView, navigateToView, pendingPrompt, setPendingPrompt, consumePendingPrompt, pendingAction, setPendingAction, clearPendingAction, isDemo],
  );

  return (
    <LayoutContext.Provider value={ctx}>
      <div className="flex h-full min-h-0 flex-1">
        {/* Left rail */}
        <Rail
          expanded={railExpanded}
          onToggle={toggleRail}
          userName={userName}
        />

        {/* Center stage */}
        <main className="flex min-w-0 flex-1 flex-col @container/main">{children}</main>

        {/* Right inspector — slides in on demand */}
        <Inspector item={inspectorItem} onClose={closeInspector} />
      </div>

      {/* Quick Action confirmation dialog */}
      <QuickActionConfirmDialog
        action={pendingAction}
        onConfirm={confirmPendingAction}
        onCancel={clearPendingAction}
      />
    </LayoutContext.Provider>
  );
}
