"use client";

import type { PipelinePhase as Phase } from "@/lib/pipeline-phase";
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
export function DemoInsightBar({ phase }: { phase?: Phase }) {
  const ctx = useDemoAnnotations();
  if (!ctx?.enabled) return null;

  const message = PHASE_MESSAGES[phase ?? ctx.phase] ?? PHASE_MESSAGES.idle;

  return (
    <div className="animate-step-enter border-t border-tv-border-subtle bg-tv-bg px-4 py-1.5">
      <p className="text-center text-[11px] text-tv-text">
        {message}
      </p>
    </div>
  );
}
