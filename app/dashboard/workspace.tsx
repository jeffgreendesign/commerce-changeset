"use client";

import { useCallback, useRef } from "react";
import { toast } from "sonner";
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
import { useGeminiLive } from "@/lib/hooks/use-gemini-live";

export function Workspace() {
  const { activeView } = useLayout();
  const { draftChangeset, phase, cancelDraft, executeChangeset, submitIntent } =
    useWorkspace();

  const voiceStartTimeRef = useRef(0);

  // ── Voice integration ──────────────────────────────────────────────

  const handleVoiceToolCall = useCallback(
    async (name: string, args: Record<string, unknown>) => {
      if (name === "submit_commerce_change" && typeof args.request === "string") {
        if (phase === "executing" || phase === "preview") {
          return { error: "A changeset is already in progress" };
        }
        submitIntent(args.request);
        return { success: true, source: "workspace_voice" };
      }
      return { error: `Unknown tool: ${name}` };
    },
    [phase, submitIntent],
  );

  const handleUserTranscript = useCallback(
    (text: string) => {
      if (phase === "executing" || phase === "preview") return;
      submitIntent(text);
    },
    [phase, submitIntent],
  );

  const geminiLive = useGeminiLive({
    onToolCall: handleVoiceToolCall,
    onUserTranscript: handleUserTranscript,
    onModelTranscript: (text: string) => {
      toast.info(text, { duration: 5000 });
    },
    onError: (msg: string) => toast.error(`Voice error: ${msg}`),
  });

  const voiceActive =
    geminiLive.connectionState === "connected" ||
    geminiLive.connectionState === "reconnecting";
  const voiceConnecting = geminiLive.connectionState === "connecting";

  const handleVoiceActivate = useCallback(async () => {
    voiceStartTimeRef.current = Date.now();
    try {
      await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "init" }),
      });
    } catch {
      // Non-critical — pattern detection failure shouldn't block voice
    }
    await geminiLive.connect();
  }, [geminiLive]);

  const handleVoiceDeactivate = useCallback(async () => {
    geminiLive.disconnect();
    const durationMinutes = (Date.now() - voiceStartTimeRef.current) / 60000;
    try {
      await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "end_session",
          sessionId: crypto.randomUUID(),
          sessionDurationMinutes: durationMinutes,
          operationCount: draftChangeset?.operations.length ?? 0,
          operationTypes:
            draftChangeset?.operations.map((o) => o.action) ?? [],
          errorCount: 0,
          avgStressLevel: geminiLive.stressLevel,
          avgSpeechPace: geminiLive.voiceMetrics.pace,
          peakStressLevel: geminiLive.peakStressLevel,
          emotionalStateTransitions: geminiLive.emotionalStateTransitions,
          toolCallSummary: geminiLive.toolCallOutcomes,
          model: geminiLive.sidecarStatus.connected
            ? "3.1-primary+2.5-sidecar"
            : "3.1-primary-only",
        }),
      });
    } catch {
      // Non-critical
    }
  }, [geminiLive, draftChangeset]);

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
          <IntentBar
            voiceActive={voiceActive}
            voiceConnecting={voiceConnecting}
            onVoiceActivate={handleVoiceActivate}
            onVoiceDeactivate={handleVoiceDeactivate}
            emotionalState={geminiLive.emotionalState}
            stressLevel={geminiLive.stressLevel}
            inputLevel={geminiLive.inputLevel}
            connectionState={geminiLive.connectionState}
            isSpeaking={geminiLive.isSpeaking}
            sidecarStatus={geminiLive.sidecarStatus}
            volume={geminiLive.volume}
            onVolumeChange={geminiLive.setVolume}
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
