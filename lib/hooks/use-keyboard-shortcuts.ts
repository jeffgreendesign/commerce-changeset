"use client";

import { useEffect } from "react";

interface ShortcutHandlers {
  onSubmit?: () => void;
  onEscape?: () => void;
}

/**
 * Registers global keyboard shortcuts for the dashboard.
 *
 * - Cmd+Enter / Ctrl+Enter → onSubmit (send message / execute draft)
 * - Escape → onEscape (dismiss panels / cancel)
 *
 * Note: Cmd+K is handled by CommandPalette directly.
 */
export function useKeyboardShortcuts({ onSubmit, onEscape }: ShortcutHandlers) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
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
  }, [onSubmit, onEscape]);
}
