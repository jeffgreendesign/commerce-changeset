"use client";

import { useWorkspace } from "@/components/workspace/workspace-provider";
import { ContextSpine } from "@/components/workspace/context-spine";
import { LivingSurface } from "@/components/workspace/living-surface";
import { IntentBar } from "@/components/workspace/intent-bar";
import { ChangesetSummary } from "@/components/workspace/changeset-summary";
import { DraftsView } from "@/components/workspace/drafts-view";
import { InspectorPanel } from "@/components/workspace/inspector-panel";
import { TimelineView } from "@/components/workspace/timeline-view";
import { AgentActivity } from "@/components/dashboard/agent-activity";
import { useLayout } from "@/components/dashboard/layout-shell";

export function Workspace() {
  const { activeView } = useLayout();
  const { draftChangeset, phase, cancelDraft, executeChangeset } =
    useWorkspace();

  return (
    <div className="flex h-full min-h-0 flex-1">
      {/* Context Spine — desktop only (hidden on mobile via CSS) */}
      <ContextSpine />

      {/* View routing based on Context Spine selection */}
      {activeView === "drafts" ? (
        <DraftsView />
      ) : activeView === "timeline" ? (
        <TimelineView />
      ) : activeView === "activity" ? (
        <div className="flex min-w-0 flex-1 flex-col overflow-auto p-4 sm:p-6">
          <div className="mx-auto w-full max-w-2xl space-y-4">
            <div>
              <h2 className="text-sm font-semibold">Agent Activity</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Real-time agent orchestration traces
              </p>
            </div>
            <AgentActivity
              phase={
                phase === "idle"
                  ? "idle"
                  : phase === "preview"
                    ? "draft"
                    : phase === "executing"
                      ? "executing"
                      : phase === "complete"
                        ? "complete"
                        : phase === "error"
                          ? "error"
                          : "idle"
              }
              requiresCIBA={draftChangeset?.riskSummary?.requiresCIBA === true}
              operationCount={draftChangeset?.operations.length ?? 0}
              results={draftChangeset?.execution?.results}
            />
            {phase === "idle" && !draftChangeset && (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                <p className="text-xs text-muted-foreground">
                  No active agent operations. Submit a change from the workspace
                  to see agent traces here.
                </p>
              </div>
            )}
          </div>
        </div>
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

      {/* Inspector — slides in from right when products are selected (workspace view only) */}
      {(activeView === "workspace" || activeView === "drafts") && (
        <InspectorPanel />
      )}
    </div>
  );
}
