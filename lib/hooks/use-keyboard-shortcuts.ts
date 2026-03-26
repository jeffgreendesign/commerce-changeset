"use client";

import { useEffect } from "react";

interface ShortcutHandlers {
  onSubmit?: () => void;
  onEscape?: () => void;
  /** When false, all shortcuts are suppressed. Defaults to true. */
  enabled?: boolean;
}

/**
 * Registers global keyboard shortcuts for the dashboard.
 *
 * - Cmd+Enter / Ctrl+Enter → onSubmit (send message / execute draft)
 * - Escape → onEscape (dismiss panels / cancel)
 *
 * Shortcuts are suppressed when a dialog or command palette is open.
 * Note: Cmd+K is handled by CommandPalette directly.
 */
export function useKeyboardShortcuts({
  onSubmit,
  onEscape,
  enabled = true,
}: ShortcutHandlers) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!enabled) return;

      // Suppress shortcuts when a dialog or command palette is open
      if (
        document.querySelector("[data-slot=dialog-content]") ||
        document.querySelector("[cmdk-dialog]")
      ) {
        return;
      }

      // Cmd+Enter or Ctrl+Enter → submit
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onSubmit?.();
        return;
      }

      // Escape → dismiss
      if (e.key === "Escape") {
        onEscape?.();
        return;
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onSubmit, onEscape, enabled]);
}
