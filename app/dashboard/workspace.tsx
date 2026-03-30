"use client";

import { WorkspaceProvider } from "@/components/workspace/workspace-provider";
import { ContextSpine } from "@/components/workspace/context-spine";
import { LivingSurface } from "@/components/workspace/living-surface";
import { IntentBar } from "@/components/workspace/intent-bar";

export function Workspace() {
  return (
    <WorkspaceProvider>
      <div className="flex h-full min-h-0 flex-1">
        {/* Context Spine — desktop only (hidden on mobile via CSS) */}
        <ContextSpine />

        {/* Main surface + intent bar */}
        <div className="flex min-w-0 flex-1 flex-col">
          <LivingSurface />
          <IntentBar />
        </div>
      </div>
    </WorkspaceProvider>
  );
}
