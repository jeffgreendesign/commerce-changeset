"use client";

import { useWorkspace } from "@/components/workspace/workspace-provider";
import { ContextSpine } from "@/components/workspace/context-spine";
import { LivingSurface } from "@/components/workspace/living-surface";
import { IntentBar } from "@/components/workspace/intent-bar";
import { ChangesetSummary } from "@/components/workspace/changeset-summary";
import { DraftsView } from "@/components/workspace/drafts-view";
import { useLayout } from "@/components/dashboard/layout-shell";

export function Workspace() {
  const { activeView } = useLayout();
  const { draftChangeset, phase, cancelDraft, executeChangeset } =
    useWorkspace();

  return (
    <div className="flex h-full min-h-0 flex-1">
      {/* Context Spine — desktop only (hidden on mobile via CSS) */}
      <ContextSpine />

      {/* Main surface + intent bar, or drafts view */}
      {activeView === "drafts" ? (
        <DraftsView />
      ) : (
        <div className="flex min-w-0 flex-1 flex-col">
          <LivingSurface />
          {/* Changeset summary — sits between surface and intent bar */}
          {draftChangeset && phase !== "idle" && (
            <ChangesetSummary
              changeset={draftChangeset}
              onCancel={cancelDraft}
              onExecute={executeChangeset}
              executing={phase === "executing"}
            />
          )}
          <IntentBar />
        </div>
      )}
    </div>
  );
}
