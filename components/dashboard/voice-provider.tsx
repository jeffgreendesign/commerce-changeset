"use client";

/**
 * VoiceProvider — persistent voice agent context.
 *
 * Wraps a single `useGeminiLive` instance so the voice session survives
 * view navigation. Views register their own tool-call handlers on mount
 * and unregister on unmount; the provider routes calls accordingly.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useGeminiLive } from "@/lib/hooks/use-gemini-live";
import type { UseGeminiLiveReturn } from "@/lib/hooks/use-gemini-live";
import { useLayout } from "@/components/dashboard/layout-shell";
import { ACTIVE_VIEWS, type ActiveView } from "@/lib/navigation-types";
import type { PipelinePhase } from "@/lib/pipeline-phase";
import type {
  EmotionalState,
  ToolCallHandler,
  GeminiLiveConnectionState,
  SidecarStatus,
  VoiceMetrics,
  EmotionalStateTransition,
  ToolCallOutcome,
} from "@/lib/voice/types";

// ── Types ────────────────────────────────────────────────────────────

/** Handler that views register to handle commerce tool calls. */
export type ViewToolHandler = (
  name: string,
  args: Record<string, unknown>,
) => Promise<Record<string, unknown>>;

/** Callbacks views can register for transcript events. */
export interface TranscriptCallbacks {
  onUserTranscript?: (text: string, finished: boolean) => void;
  onModelTranscript?: (text: string, finished: boolean) => void;
}

export interface VoiceContextValue {
  // Connection state
  connectionState: GeminiLiveConnectionState;
  sidecarStatus: SidecarStatus;
  isCapturing: boolean;
  isSpeaking: boolean;
  inputLevel: number;
  error: string | null;

  // Derived booleans
  voiceActive: boolean;
  voiceConnecting: boolean;

  // Voice metrics & affective state
  emotionalState: EmotionalState;
  stressLevel: number;
  voiceMetrics: VoiceMetrics;
  emotionalStateTransitions: EmotionalStateTransition[];
  toolCallOutcomes: ToolCallOutcome[];
  peakStressLevel: number;

  // Audio playback
  volume: number;
  setVolume: (volume: number) => void;

  // Core operations
  handleVoiceActivate: () => Promise<void>;
  handleVoiceDeactivate: () => Promise<void>;
  sendText: (message: string) => void;

  // Demo affect (persists across view switches)
  demoEmotionalState: EmotionalState;
  demoStressLevel: number;
  setDemoAffect: (phase: PipelinePhase) => void;

  // View handler registration
  registerToolHandler: (handler: ViewToolHandler) => void;
  unregisterToolHandler: (handler: ViewToolHandler) => void;
  registerTranscriptCallbacks: (callbacks: TranscriptCallbacks) => void;
  unregisterTranscriptCallbacks: () => void;
}

const VoiceContext = createContext<VoiceContextValue | null>(null);

export function useVoice(): VoiceContextValue {
  const ctx = useContext(VoiceContext);
  if (!ctx) throw new Error("useVoice must be used inside <VoiceProvider>");
  return ctx;
}

// ── Demo affect helpers ─────────────────────────────────────────────

function demoAffectFromPhase(phase: PipelinePhase): EmotionalState {
  switch (phase) {
    case "loading":
      return "rushed";
    case "draft":
      return "uncertain";
    case "executing":
    case "rolling_back":
    case "error":
      return "stressed";
    case "complete":
      return "calm";
    default:
      return "calm";
  }
}

function demoStressFromPhase(phase: PipelinePhase): number {
  switch (phase) {
    case "loading":
      return 0.5;
    case "draft":
      return 0.35;
    case "executing":
    case "rolling_back":
      return 0.75;
    case "error":
      return 0.8;
    case "complete":
      return 0.1;
    default:
      return 0.15;
  }
}

// ── Provider ────────────────────────────────────────────────────────

export function VoiceProvider({ children }: { children: ReactNode }) {
  const { activeView, setActiveView } = useLayout();

  // Refs for tool routing — avoids stale closures
  const activeViewRef = useRef<ActiveView>(activeView);
  useEffect(() => {
    activeViewRef.current = activeView;
  }, [activeView]);

  const setActiveViewRef = useRef(setActiveView);
  useEffect(() => {
    setActiveViewRef.current = setActiveView;
  }, [setActiveView]);

  // View-specific tool handler (registered by the active view)
  const toolHandlerRef = useRef<ViewToolHandler | null>(null);

  // Transcript callbacks (registered by chat view)
  const transcriptCallbacksRef = useRef<TranscriptCallbacks | null>(null);

  // Stable session ID — generated on activate, used on deactivate
  const voiceSessionIdRef = useRef<string | null>(null);

  // Demo affect state (persists across view switches)
  const [demoEmotionalState, setDemoEmotionalState] =
    useState<EmotionalState>("calm");
  const [demoStressLevel, setDemoStressLevel] = useState(0.15);

  const setDemoAffect = useCallback((phase: PipelinePhase) => {
    setDemoEmotionalState(demoAffectFromPhase(phase));
    setDemoStressLevel(demoStressFromPhase(phase));
  }, []);

  // Voice start time for session duration logging
  const voiceStartTimeRef = useRef(0);

  // ── Tool call routing ──────────────────────────────────────────────

  const handleToolCall: ToolCallHandler = useCallback(
    async (name: string, args: Record<string, unknown>) => {
      // navigate_to_view is always handled by the provider
      if (name === "navigate_to_view") {
        const view = args.view;
        if (
          typeof view === "string" &&
          (ACTIVE_VIEWS as readonly string[]).includes(view)
        ) {
          setActiveViewRef.current(view as ActiveView);
          return {
            success: true,
            message: `Navigated to ${view} view`,
          };
        }
        return {
          error: `Invalid view: ${String(view)}. Valid views: ${ACTIVE_VIEWS.join(", ")}`,
        };
      }

      // query_product_data is view-independent — always call reader API
      if (name === "query_product_data") {
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

      // Capture handler at call start — runs to completion even if view changes
      const handler = toolHandlerRef.current;
      if (handler) {
        return handler(name, args);
      }

      // Fallback: no view handler registered — use direct API calls
      return { error: `No active view handler for tool: ${name}` };
    },
    [],
  );

  // ── Transcript routing ─────────────────────────────────────────────

  const handleUserTranscript = useCallback(
    (text: string, finished: boolean) => {
      transcriptCallbacksRef.current?.onUserTranscript?.(text, finished);
    },
    [],
  );

  const handleModelTranscript = useCallback(
    (text: string, finished: boolean) => {
      transcriptCallbacksRef.current?.onModelTranscript?.(text, finished);
    },
    [],
  );

  // ── Gemini Live instance ───────────────────────────────────────────

  const geminiLive: UseGeminiLiveReturn = useGeminiLive({
    onToolCall: handleToolCall,
    onUserTranscript: handleUserTranscript,
    onModelTranscript: handleModelTranscript,
    onError: (msg) => {
      // Error handled via the returned error state
      console.error("[VoiceProvider] Gemini error:", msg);
    },
  });

  // ── Activate / Deactivate ──────────────────────────────────────────

  const handleVoiceActivate = useCallback(async () => {
    voiceStartTimeRef.current = Date.now();
    const sessionId = crypto.randomUUID();
    voiceSessionIdRef.current = sessionId;
    try {
      const res = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "init", sessionId }),
      });
      if (res.ok) {
        const data = (await res.json()) as { sessionId?: string };
        // Use server-assigned ID if provided
        if (data.sessionId) voiceSessionIdRef.current = data.sessionId;
      }
    } catch {
      // Non-critical — pattern detection failure shouldn't block voice
    }
    await geminiLive.connect();
  }, [geminiLive]);

  const handleVoiceDeactivate = useCallback(async () => {
    geminiLive.disconnect();
    const durationMinutes =
      (Date.now() - voiceStartTimeRef.current) / 60000;
    const sessionId = voiceSessionIdRef.current;
    voiceSessionIdRef.current = null;
    try {
      await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "end_session",
          sessionId: sessionId ?? crypto.randomUUID(),
          sessionDurationMinutes: durationMinutes,
          operationCount: 0,
          operationTypes: [],
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
  }, [geminiLive]);

  // ── Handler registration ───────────────────────────────────────────

  const registerToolHandler = useCallback((handler: ViewToolHandler) => {
    toolHandlerRef.current = handler;
  }, []);

  const unregisterToolHandler = useCallback((handler: ViewToolHandler) => {
    // Only unregister if it's the same handler (prevents race conditions)
    if (toolHandlerRef.current === handler) {
      toolHandlerRef.current = null;
    }
  }, []);

  const registerTranscriptCallbacks = useCallback(
    (callbacks: TranscriptCallbacks) => {
      transcriptCallbacksRef.current = callbacks;
    },
    [],
  );

  const unregisterTranscriptCallbacks = useCallback(() => {
    transcriptCallbacksRef.current = null;
  }, []);

  // ── Derived state ──────────────────────────────────────────────────

  const voiceActive =
    geminiLive.connectionState === "connected" ||
    geminiLive.connectionState === "reconnecting";
  const voiceConnecting = geminiLive.connectionState === "connecting";

  // ── Context value ──────────────────────────────────────────────────

  const ctx = useMemo<VoiceContextValue>(
    () => ({
      connectionState: geminiLive.connectionState,
      sidecarStatus: geminiLive.sidecarStatus,
      isCapturing: geminiLive.isCapturing,
      isSpeaking: geminiLive.isSpeaking,
      inputLevel: geminiLive.inputLevel,
      error: geminiLive.error,
      voiceActive,
      voiceConnecting,
      emotionalState: geminiLive.emotionalState,
      stressLevel: geminiLive.stressLevel,
      voiceMetrics: geminiLive.voiceMetrics,
      emotionalStateTransitions: geminiLive.emotionalStateTransitions,
      toolCallOutcomes: geminiLive.toolCallOutcomes,
      peakStressLevel: geminiLive.peakStressLevel,
      volume: geminiLive.volume,
      setVolume: geminiLive.setVolume,
      handleVoiceActivate,
      handleVoiceDeactivate,
      sendText: geminiLive.sendText,
      demoEmotionalState,
      demoStressLevel,
      setDemoAffect,
      registerToolHandler,
      unregisterToolHandler,
      registerTranscriptCallbacks,
      unregisterTranscriptCallbacks,
    }),
    [
      geminiLive.connectionState,
      geminiLive.sidecarStatus,
      geminiLive.isCapturing,
      geminiLive.isSpeaking,
      geminiLive.inputLevel,
      geminiLive.error,
      voiceActive,
      voiceConnecting,
      geminiLive.emotionalState,
      geminiLive.stressLevel,
      geminiLive.voiceMetrics,
      geminiLive.emotionalStateTransitions,
      geminiLive.toolCallOutcomes,
      geminiLive.peakStressLevel,
      geminiLive.volume,
      geminiLive.setVolume,
      handleVoiceActivate,
      handleVoiceDeactivate,
      geminiLive.sendText,
      demoEmotionalState,
      demoStressLevel,
      setDemoAffect,
      registerToolHandler,
      unregisterToolHandler,
      registerTranscriptCallbacks,
      unregisterTranscriptCallbacks,
    ],
  );

  return (
    <VoiceContext.Provider value={ctx}>{children}</VoiceContext.Provider>
  );
}
