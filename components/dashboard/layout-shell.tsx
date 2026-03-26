"use client";

import {
  useState,
  useCallback,
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { Rail } from "./rail";
import { Inspector, type InspectableItem } from "./inspector";

// ── Context ──────────────────────────────────────────────────────────

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

  const inspect = useCallback((item: InspectableItem) => {
    setInspectorItem(item);
  }, []);

  const closeInspector = useCallback(() => {
    setInspectorItem(null);
  }, []);

  const toggleRail = useCallback(() => {
    setRailExpanded((prev) => !prev);
  }, []);

  const ctx = useMemo<LayoutContextValue>(
    () => ({
      inspect,
      closeInspector,
      inspectorOpen: inspectorItem !== null,
      railExpanded,
      toggleRail,
    }),
    [inspect, closeInspector, inspectorItem, railExpanded, toggleRail],
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
        <main className="flex min-w-0 flex-1 flex-col">{children}</main>

        {/* Right inspector — slides in on demand */}
        <Inspector item={inspectorItem} onClose={closeInspector} />
      </div>
    </LayoutContext.Provider>
  );
}
