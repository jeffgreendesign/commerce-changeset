"use client";

import { DEMO_SUGGESTIONS } from "@/lib/demo/scenarios";

interface DemoSuggestionChipsProps {
  onSelect: (prompt: string) => void;
}

/**
 * Floating suggestion pills shown when the demo chat is idle.
 * Clicking inserts the text and auto-submits.
 */
export function DemoSuggestionChips({ onSelect }: DemoSuggestionChipsProps) {
  return (
    <div className="flex flex-wrap justify-center gap-2 px-4 py-3">
      {DEMO_SUGGESTIONS.map((suggestion) => (
        <button
          key={suggestion}
          type="button"
          onClick={() => onSelect(suggestion)}
          className="glass-subtle animate-step-enter rounded-full border border-zinc-200 px-3 py-1.5 text-xs text-zinc-700 transition-all hover:border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}
