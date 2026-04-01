"use client";

import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useWorkspace } from "@/components/workspace/workspace-provider";
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
  const {
    draftChangeset,
    phase,
    cancelDraft,
    executeChangeset,
    submitIntent,
  } = useWorkspace();

  const voiceStartTimeRef = useRef(0);
  const teardownRef = useRef<() => Promise<void>>(async () => { /* placeholder until handleVoiceDeactivate is assigned */ });

  // Ref for draftChangeset so tool handlers can read fresh state.
  // Updated via effect (React 19 forbids ref writes during render).
  const draftChangesetRef = useRef(draftChangeset);
  useEffect(() => {
    draftChangesetRef.current = draftChangeset;
  }, [draftChangeset]);

  // ── Voice tool handling ────────────────────────────────────────────
  // Mirrors chat.tsx's handleGeminiToolCall but uses workspace state.
  // Each tool calls the relevant API directly — no intermediate guards
  // that would block cross-phase tool chains (submit → execute).

  const handleVoiceToolCall = useCallback(
    async (name: string, args: Record<string, unknown>) => {
      switch (name) {
        case "submit_commerce_change": {
          if (typeof args.request !== "string") return { error: "Missing request" };
          if (phase === "executing" || phase === "preview") {
            return { error: "A changeset is already in progress" };
          }
          // submitIntent already injects selected-product context internally
          const cs = await submitIntent(args.request);
          if (!cs) {
            draftChangesetRef.current = null;
            return { success: false, error: "Failed to create changeset — try a more specific request" };
          }
          // Store synchronously so execute_changeset can read it immediately
          // even before React state commits.
          draftChangesetRef.current = cs;
          return {
            success: true,
            message: "Changeset created and displayed for review. The user can see the operations on screen. Ask the user if they want to execute or modify.",
          };
        }
        case "execute_changeset": {
          const cs = draftChangesetRef.current;
          if (!cs) return { error: "No draft changeset to execute. Call submit_commerce_change first." };
          const result = await executeChangeset(cs);
          return result;
        }
        case "query_product_data": {
          if (typeof args.query !== "string") return { error: "Missing query" };
          try {
            const res = await fetch("/api/reader", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ message: args.query }),
            });
            if (!res.ok) return { error: "Reader query failed" };
            const data = (await res.json()) as { text?: string };
            return { success: true, data: data.text ?? data };
          } catch {
            return { error: "Reader query failed" };
          }
        }
        case "voice_approve": {
          const cs = draftChangesetRef.current;
          if (!cs) return { error: "No changeset to approve. Call submit_commerce_change first." };
          const result = await executeChangeset(cs);
          return { ...result, status: result.success ? "approved_and_executed" : result.status };
        }
        default:
          return { error: `Unknown tool: ${name}` };
      }
    },
    [phase, submitIntent, executeChangeset],
  );

  // User speech is processed by the Gemini model which invokes tools.
  // No direct transcript → submission path (that conflicts with tool calls).
  const geminiLive = useGeminiLive({
    onToolCall: handleVoiceToolCall,
    onError: (msg: string) => toast.error(`Voice error: ${msg}`),
  });

  const voiceActive =
    geminiLive.connectionState === "connected" ||
    geminiLive.connectionState === "reconnecting";
  const voiceConnecting = geminiLive.connectionState === "connecting";

  const handleVoiceActivate = useCallback(async () => {
    voiceStartTimeRef.current = Date.now();
    fetch("/api/voice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "init" }),
    }).catch(() => {
      // Non-critical — pattern detection failure shouldn't block voice
    });
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

  // Auto-disconnect voice (with full teardown) when navigating to a
  // workspace sub-view where IntentBar controls aren't rendered
  useEffect(() => {
    teardownRef.current = handleVoiceDeactivate;
  }, [handleVoiceDeactivate]);
  useEffect(() => {
    if (activeView !== "workspace" && voiceActive) {
      void teardownRef.current();
    }
  }, [activeView, voiceActive]);

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
              onExecute={() => executeChangeset().then(() => {})}
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
