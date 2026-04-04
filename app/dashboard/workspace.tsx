"use client";

import { useCallback, useEffect, useRef } from "react";
import { z } from "zod";
import { useWorkspace, type ChatActivityPhase, type WorkspacePhase } from "@/components/workspace/workspace-provider";
import { LivingSurface } from "@/components/workspace/living-surface";
import { IntentBar } from "@/components/workspace/intent-bar";
import { ChangesetSummary } from "@/components/workspace/changeset-summary";
import { DraftsView } from "@/components/workspace/drafts-view";
import { InspectorPanel } from "@/components/workspace/inspector-panel";
import { TimelineView } from "@/components/workspace/timeline-view";
import { AgentActivity } from "@/components/dashboard/agent-activity";
import { useLayout } from "@/components/dashboard/layout-shell";
import { useVoice, type ViewToolHandler } from "@/components/dashboard/voice-provider";

export function Workspace() {
  const { activeView, isDemo } = useLayout();
  const {
    draftChangeset,
    phase,
    cancelDraft,
    executeChangeset,
    submitIntent,
    chatActivityPhase,
    chatActivityChangeset,
  } = useWorkspace();
  const voice = useVoice();
  const { registerToolHandler, unregisterToolHandler } = voice;

  // Ref for draftChangeset so tool handlers can read fresh state.
  // Updated via effect (React 19 forbids ref writes during render).
  const draftChangesetRef = useRef(draftChangeset);
  useEffect(() => {
    draftChangesetRef.current = draftChangeset;
  }, [draftChangeset]);

  // ── Workspace tool handler (registered with VoiceProvider) ─────────

  const workspaceToolHandler: ViewToolHandler = useCallback(
    async (name: string, args: Record<string, unknown>) => {
      switch (name) {
        case "submit_commerce_change": {
          if (typeof args.request !== "string") return { error: "Missing request" };
          if (phase === "executing" || phase === "preview") {
            return { error: "A changeset is already in progress" };
          }
          const cs = await submitIntent(args.request);
          if (!cs) {
            draftChangesetRef.current = null;
            return { success: false, error: "Failed to create changeset — try a more specific request" };
          }
          draftChangesetRef.current = cs;
          return {
            success: true,
            changesetId: cs.id,
            message: "Changeset created and displayed for review. The user can see the operations on screen. Ask the user if they want to execute or modify.",
          };
        }
        case "execute_changeset": {
          const cs = draftChangesetRef.current;
          if (!cs) return { error: "No draft changeset to execute. Call submit_commerce_change first." };
          const idParse = z.string().min(1).safeParse(args.changesetId);
          if (!idParse.success) return { error: "Invalid or missing changesetId" };
          if (idParse.data !== cs.id) {
            return { error: `Changeset ID mismatch: expected ${cs.id}, got ${idParse.data}` };
          }
          const result = await executeChangeset(cs);
          return result;
        }
        case "voice_approve": {
          const cs = draftChangesetRef.current;
          if (!cs) return { error: "No changeset to approve. Call submit_commerce_change first." };
          const idParse = z.string().min(1).safeParse(args.changesetId);
          if (!idParse.success) return { error: "Invalid or missing changesetId" };
          if (idParse.data !== cs.id) {
            return { error: `Changeset ID mismatch: expected ${cs.id}, got ${idParse.data}` };
          }
          const result = await executeChangeset(cs);
          return { ...result, status: result.success ? "approved_and_executed" : result.status };
        }
        default:
          return { error: `Unknown tool: ${name}` };
      }
    },
    [phase, submitIntent, executeChangeset],
  );

  // Register workspace tool handler with VoiceProvider when this view mounts
  useEffect(() => {
    registerToolHandler(workspaceToolHandler);
    return () => unregisterToolHandler(workspaceToolHandler);
  }, [registerToolHandler, unregisterToolHandler, workspaceToolHandler]);

  // When the workspace itself is idle, fall back to chat-reported activity
  // so the Activity panel reflects Chat, Voice, and Quick Action interactions.
  const wsActive = phase !== "idle";
  const activityPhase: ChatActivityPhase | WorkspacePhase = wsActive
    ? phase
    : chatActivityPhase;
  const activityChangeset = wsActive ? draftChangeset : chatActivityChangeset;
  const activityIdle = activityPhase === "idle" && !activityChangeset;

  return (
    <div className="flex h-full min-h-0 flex-1">
      {/* View routing */}
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
              phase={activityPhase === "preview" ? "draft" : activityPhase}
              requiresCIBA={activityChangeset?.riskSummary?.requiresCIBA === true}
              operationCount={activityChangeset?.operations.length ?? 0}
              results={activityChangeset?.execution?.results}
            />
            {activityIdle && (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                <p className="text-xs text-muted-foreground">
                  No recent activity — actions from chat, voice, or Quick Actions
                  will appear here.
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
              onExecute={() => executeChangeset().then(() => {})}
              executing={phase === "executing"}
            />
          )}
          <IntentBar
            voiceActive={voice.voiceActive}
            voiceConnecting={voice.voiceConnecting}
            onVoiceActivate={voice.handleVoiceActivate}
            onVoiceDeactivate={voice.handleVoiceDeactivate}
            emotionalState={isDemo ? voice.demoEmotionalState : voice.emotionalState}
            stressLevel={isDemo ? voice.demoStressLevel : voice.stressLevel}
            inputLevel={voice.inputLevel}
            connectionState={voice.connectionState}
            isSpeaking={voice.isSpeaking}
            sidecarStatus={voice.sidecarStatus}
            volume={voice.volume}
            onVolumeChange={voice.setVolume}
          />
        </div>
      )}

      {/* Inspector — slides in from right when products are selected (workspace view only) */}
      {(activeView === "workspace" || activeView === "drafts") && (
        <InspectorPanel />
      )}
    </div>
  );
}
