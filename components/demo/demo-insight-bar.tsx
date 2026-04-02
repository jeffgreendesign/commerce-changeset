"use client";

import { useDemoAnnotations } from "./demo-annotation-provider";

const PHASE_MESSAGES: Record<string, string> = {
  idle: "Type a commerce change or tap a suggestion to start.",
  loading: "Orchestrator decomposing your request with Claude Sonnet 4.6...",
  draft: "Policy engine assigned risk tiers. Tier 2+ operations need phone approval.",
  executing: "Writer executing via Token Vault → Google Sheets API. No raw credentials.",
  rolling_back: "Building reversal changeset through the same policy engine.",
  complete: "SHA-256 audit hash sealed. Every agent action is in the receipt.",
  error: "Something went wrong. Check the error details above.",
};

/**
 * Slim bar pinned above the chat input with a one-liner about the current phase.
 * Only renders when demo annotations are enabled.
 */
export function DemoInsightBar() {
  const ctx = useDemoAnnotations();
  if (!ctx?.enabled) return null;

  const message = PHASE_MESSAGES[ctx.phase] ?? PHASE_MESSAGES.idle;

  return (
    <div className="animate-step-enter border-t border-indigo-100 bg-indigo-50/80 px-4 py-1.5 dark:border-indigo-900/50 dark:bg-indigo-950/30">
      <p className="text-center text-[11px] text-indigo-600 dark:text-indigo-400">
        {message}
      </p>
    </div>
  );
}
