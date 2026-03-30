"use client";

import { WorkspaceProvider } from "@/components/workspace/workspace-provider";
import { ContextSpine } from "@/components/workspace/context-spine";
import { LivingSurface } from "@/components/workspace/living-surface";
import { IntentBar } from "@/components/workspace/intent-bar";
import { DraftsView } from "@/components/workspace/drafts-view";
import { useLayout } from "@/components/dashboard/layout-shell";

export function Workspace() {
  const { activeView } = useLayout();

  return (
    <WorkspaceProvider>
      <div className="flex h-full min-h-0 flex-1">
        {/* Context Spine — desktop only (hidden on mobile via CSS) */}
        <ContextSpine />

        {/* Main surface + intent bar, or drafts view */}
        {activeView === "drafts" ? (
          <DraftsView />
        ) : (
          <div className="flex min-w-0 flex-1 flex-col">
            <LivingSurface />
            <IntentBar />
          </div>
        )}
      </div>
    </WorkspaceProvider>
  );
}
