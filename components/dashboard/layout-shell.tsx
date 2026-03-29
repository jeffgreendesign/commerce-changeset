"use client";

import {
  useState,
  useCallback,
  useRef,
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { Rail } from "./rail";
import { Inspector, type InspectableItem } from "./inspector";
import { generateChatId } from "@/lib/chat-history";

// ── Context ──────────────────────────────────────────────────────────

type ActiveView = "chat" | "history" | "actions";

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
}

export function LayoutShell({ children, userName }: LayoutShellProps) {
  const [railExpanded, setRailExpanded] = useState(false);
  const [inspectorItem, setInspectorItem] = useState<InspectableItem | null>(
    null,
  );
  const [activeChatId, setActiveChatId] = useState(() => generateChatId());
  const [activeView, setActiveView] = useState<ActiveView>("chat");
  const [pendingPrompt, setPendingPromptState] = useState<string | null>(null);
  const pendingPromptRef = useRef<string | null>(null);

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
    setActiveChatId(generateChatId());
    setActiveView("chat");
  }, []);

  const loadChat = useCallback((id: string) => {
    setActiveChatId(id);
    setActiveView("chat");
  }, []);

  const setPendingPrompt = useCallback((prompt: string) => {
    pendingPromptRef.current = prompt;
    setPendingPromptState(prompt);
    setActiveView("chat");
  }, []);

  const consumePendingPrompt = useCallback(() => {
    const p = pendingPromptRef.current;
    if (p) {
      pendingPromptRef.current = null;
      setPendingPromptState(null);
    }
    return p;
  }, []);

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
      setActiveView,
      pendingPrompt,
      setPendingPrompt,
      consumePendingPrompt,
    }),
    [inspect, closeInspector, inspectorItem, railExpanded, toggleRail, activeChatId, startNewChat, loadChat, activeView, pendingPrompt, setPendingPrompt, consumePendingPrompt],
  );

  return (
    <LayoutContext.Provider value={ctx}>
      <div className="flex h-full min-h-0 flex-1">
        {/* Left rail — hidden on mobile, icon-only by default on md+ */}
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
    </LayoutContext.Provider>
  );
}
