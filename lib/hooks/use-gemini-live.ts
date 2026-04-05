"use client";

/**
 * useGeminiLive — dual-model sidecar hook for real-time voice.
 *
 * Primary (3.1 Flash Live): conversation, tool calls, audio response.
 * Sidecar (2.5 Native Audio): silent affective signal analysis.
 *
 * Both connections share one mic stream. Only the primary speaks back.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { GoogleGenAI } from "@google/genai";
import type { Session, LiveServerMessage } from "@google/genai";
import { DEMO_HEADER_NAME } from "@/lib/demo/config";
import {
  buildPrimarySDKConfig,
  buildSidecarSDKConfig,
  classifyEmotionalState,
} from "@/lib/voice/gemini-live";
import type {
  GeminiLiveConnectionState,
  ToolCallHandler,
  SidecarStatus,
  EmotionalState,
  VoiceMetrics,
  EmotionalStateTransition,
  ToolCallOutcome,
} from "@/lib/voice/types";

// ── Types ────────────────────────────────────────────────────────────

export interface UseGeminiLiveOptions {
  onToolCall: ToolCallHandler;
  onUserTranscript?: (text: string, turnComplete: boolean) => void;
  onModelTranscript?: (text: string, turnComplete: boolean) => void;
  onError?: (error: string) => void;
  /** When true, includes x-demo-session header on token fetch requests. */
  isDemo?: boolean;
}

export interface UseGeminiLiveReturn {
  connectionState: GeminiLiveConnectionState;
  sidecarStatus: SidecarStatus;
  isCapturing: boolean;
  isSpeaking: boolean;
  inputLevel: number;
  emotionalState: EmotionalState;
  stressLevel: number;
  voiceMetrics: VoiceMetrics;
  /** Accumulated emotional state transitions for session logging. */
  emotionalStateTransitions: EmotionalStateTransition[];
  /** Accumulated tool call outcomes for session logging. */
  toolCallOutcomes: ToolCallOutcome[];
  /** Peak stress level observed during this session. */
  peakStressLevel: number;
  /** Current output volume (0-1). */
  volume: number;
  /** Set the output volume (0-1). */
  setVolume: (volume: number) => void;
  connect: () => Promise<void>;
  disconnect: () => void;
  sendText: (message: string) => void;
  error: string | null;
}

// ── Helpers ──────────────────────────────────────────────────────────

const DEFAULT_METRICS: VoiceMetrics = {
  tone: "neutral",
  pace: "normal",
  pitchVariance: 0,
  stressLevel: 0,
  confidence: 0,
};

/** Decode base64 string → Int16 → Float32 for AudioBuffer playback. */
function decodeBase64PCMToFloat32(base64: string): Float32Array<ArrayBuffer> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  // Copy to a new ArrayBuffer to ensure it's not SharedArrayBuffer
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  const int16 = new Int16Array(buffer);
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / 32768;
  }
  return float32;
}

/** Convert Int16 ArrayBuffer to base64 string for sendRealtimeInput. */
function int16BufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// ── Hook ─────────────────────────────────────────────────────────────

export function useGeminiLive(
  options: UseGeminiLiveOptions
): UseGeminiLiveReturn {
  const { onToolCall, onUserTranscript, onModelTranscript, onError, isDemo } = options;

  // ── State ────────────────────────────────────────────────────────
  const [connectionState, setConnectionState] =
    useState<GeminiLiveConnectionState>("disconnected");
  const [sidecarStatus, setSidecarStatus] = useState<SidecarStatus>({
    connected: false,
    receiving: false,
  });
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [inputLevel, setInputLevel] = useState(0);
  const [emotionalState, setEmotionalState] = useState<EmotionalState>("calm");
  const [stressLevel, setStressLevel] = useState(0);
  const [voiceMetrics, setVoiceMetrics] =
    useState<VoiceMetrics>(DEFAULT_METRICS);
  const [error, setError] = useState<string | null>(null);

  // Session analytics accumulators
  const [emotionalStateTransitions, setEmotionalStateTransitions] = useState<
    EmotionalStateTransition[]
  >([]);
  const [toolCallOutcomes, setToolCallOutcomes] = useState<ToolCallOutcome[]>(
    []
  );
  const [peakStressLevel, setPeakStressLevel] = useState(0);
  const [volume, setVolumeState] = useState(1.0);

  // ── Refs (not in render cycle) ───────────────────────────────────
  const primarySessionRef = useRef<Session | null>(null);
  const sidecarSessionRef = useRef<Session | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const playbackContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const nextPlaybackTimeRef = useRef(0);
  const scheduledSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const gainNodeRef = useRef<GainNode | null>(null);
  const volumeRef = useRef(1.0);
  const disconnectingRef = useRef(false);
  const primaryReadyRef = useRef(false);
  const sidecarReadyRef = useRef(false);

  // Stable callback refs to avoid stale closures
  const onToolCallRef = useRef(onToolCall);
  const onUserTranscriptRef = useRef(onUserTranscript);
  const onModelTranscriptRef = useRef(onModelTranscript);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onToolCallRef.current = onToolCall;
    onUserTranscriptRef.current = onUserTranscript;
    onModelTranscriptRef.current = onModelTranscript;
    onErrorRef.current = onError;
  }, [onToolCall, onUserTranscript, onModelTranscript, onError]);

  // ── Audio playback ───────────────────────────────────────────────

  const getPlaybackContext = useCallback((): AudioContext => {
    if (!playbackContextRef.current || playbackContextRef.current.state === "closed") {
      playbackContextRef.current = new AudioContext({ sampleRate: 24000 });
      nextPlaybackTimeRef.current = playbackContextRef.current.currentTime;
      // Create a persistent GainNode for volume control
      const gain = playbackContextRef.current.createGain();
      gain.gain.value = volumeRef.current;
      gain.connect(playbackContextRef.current.destination);
      gainNodeRef.current = gain;
    }
    // iOS Safari: ensure playback context is running (may be suspended)
    if (playbackContextRef.current.state === "suspended") {
      void playbackContextRef.current.resume();
    }
    return playbackContextRef.current;
  }, []);

  const scheduleAudioChunk = useCallback(
    (float32Data: Float32Array<ArrayBuffer>) => {
      const ctx = getPlaybackContext();
      const audioBuffer = ctx.createBuffer(1, float32Data.length, 24000);
      audioBuffer.copyToChannel(float32Data, 0);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(gainNodeRef.current ?? ctx.destination);

      if (nextPlaybackTimeRef.current < ctx.currentTime) {
        nextPlaybackTimeRef.current = ctx.currentTime;
      }

      source.start(nextPlaybackTimeRef.current);
      nextPlaybackTimeRef.current += audioBuffer.duration;

      scheduledSourcesRef.current.push(source);
      setIsSpeaking(true);

      source.onended = () => {
        scheduledSourcesRef.current = scheduledSourcesRef.current.filter(
          (s) => s !== source
        );
        if (scheduledSourcesRef.current.length === 0) {
          setIsSpeaking(false);
        }
      };
    },
    [getPlaybackContext]
  );

  const stopPlayback = useCallback(() => {
    for (const source of scheduledSourcesRef.current) {
      try {
        source.stop();
      } catch {
        // Already stopped
      }
    }
    scheduledSourcesRef.current = [];
    nextPlaybackTimeRef.current = 0;
    setIsSpeaking(false);
  }, []);

  const handleSetVolume = useCallback((newVolume: number) => {
    const clamped = Math.max(0, Math.min(1, newVolume));
    volumeRef.current = clamped;
    setVolumeState(clamped);
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.setValueAtTime(
        clamped,
        gainNodeRef.current.context.currentTime
      );
    }
  }, []);

  // ── Primary message handler ──────────────────────────────────────

  const handlePrimaryMessage = useCallback(
    (message: LiveServerMessage) => {
      try {
      // Log message types for debugging
      const msgKeys = Object.keys(message).filter(
        (k) => (message as unknown as Record<string, unknown>)[k] != null
      );
      console.log("[gemini-live] Primary msg:", msgKeys.join(", "));

      // Setup complete — session is ready to receive audio
      if (message.setupComplete) {
        console.log("[gemini-live] Primary setup complete — ready for audio");
        primaryReadyRef.current = true;
        return;
      }

      // Audio output
      if (message.serverContent?.modelTurn?.parts) {
        for (const part of message.serverContent.modelTurn.parts) {
          if (part.inlineData?.data) {
            const float32 = decodeBase64PCMToFloat32(part.inlineData.data);
            scheduleAudioChunk(float32);
          }
        }
      }

      // User speech transcript (best-effort from Gemini 3.1)
      const turnComplete = message.serverContent?.turnComplete ?? false;
      const inputTx = message.serverContent?.inputTranscription;
      if (inputTx?.text) {
        onUserTranscriptRef.current?.(inputTx.text, turnComplete);
      } else if (turnComplete) {
        // Turn ended without a final user transcript chunk — finalize the bubble
        onUserTranscriptRef.current?.("", true);
      }

      // Model speech transcript (delta text — each chunk is incremental)
      const outputTx = message.serverContent?.outputTranscription;
      if (outputTx?.text) {
        onModelTranscriptRef.current?.(outputTx.text, turnComplete);
      } else if (turnComplete) {
        // Turn ended without a final transcript chunk — signal finalization
        onModelTranscriptRef.current?.("", true);
      }

      // Interruption — user started speaking while model was playing
      if (message.serverContent?.interrupted) {
        stopPlayback();
      }

      // Tool calls (3.1 synchronous — model blocks until we respond)
      if (message.toolCall?.functionCalls) {
        if (!primarySessionRef.current) return;

        const calls = message.toolCall.functionCalls;
        Promise.all(
          calls.map(async (fc) => {
            const name = fc.name ?? "unknown";
            const args = (fc.args ?? {}) as Record<string, unknown>;
            const start = performance.now();
            try {
              const result = await onToolCallRef.current(name, args);
              const durationMs = Math.round(performance.now() - start);
              setToolCallOutcomes((prev) => [
                ...prev,
                { name, success: true, durationMs },
              ]);
              return { name, id: fc.id ?? "", response: result };
            } catch (err) {
              const durationMs = Math.round(performance.now() - start);
              setToolCallOutcomes((prev) => [
                ...prev,
                { name, success: false, durationMs },
              ]);
              return {
                name,
                id: fc.id ?? "",
                response: {
                  error:
                    err instanceof Error ? err.message : "Tool call failed",
                },
              };
            }
          })
        ).then((responses) => {
          // Re-read ref — session may have changed during async tool execution
          const activeSession = primarySessionRef.current;
          if (!activeSession) {
            console.error("[gemini-live] Session lost before tool response could be sent");
            return;
          }
          console.log("[gemini-live] Sending tool responses:", responses.map(r => r.name).join(", "));
          activeSession.sendToolResponse({ functionResponses: responses });
          console.log("[gemini-live] Tool responses sent");
        }).catch((err) => {
          console.error("[gemini-live] Failed to process tool calls:", err);
        });
      }

      // goAway — session ending soon
      if (message.goAway) {
        console.warn(
          `[gemini-live] Primary session ending: ${message.goAway.timeLeft}`
        );
      }
      } catch (err) {
        console.error("[gemini-live] Error in primary message handler:", err);
      }
    },
    [scheduleAudioChunk, stopPlayback]
  );

  // ── Sidecar message handler ──────────────────────────────────────

  const handleSidecarMessage = useCallback((message: LiveServerMessage) => {
    try {
    if (message.setupComplete) {
      console.log("[gemini-live] Sidecar setup complete — ready for audio");
      sidecarReadyRef.current = true;
      return;
    }

    // Parse text responses for affect signals
    const text = message.text;
    if (text) {
      setSidecarStatus((prev) => ({ ...prev, receiving: true }));

      // Parse stress level from sidecar's text output
      const stressMatch = text.match(
        /stress(?:ed)?|elevated|tense|anxious|urgent/i
      );
      const calmMatch = text.match(/calm|relaxed|steady|neutral/i);
      const rushedMatch = text.match(/rush|fast|hurr|rapid/i);
      const uncertainMatch = text.match(
        /uncertain|hesitant|unsure|wavering/i
      );

      let newStress = 0.2; // default calm
      let newPace: "fast" | "normal" | "slow" = "normal";

      if (stressMatch) newStress = 0.75;
      else if (rushedMatch) {
        newStress = 0.5;
        newPace = "fast";
      } else if (uncertainMatch) newStress = 0.4;
      else if (calmMatch) newStress = 0.1;

      const metrics: VoiceMetrics = {
        tone: newStress > 0.5 ? "tense" : "neutral",
        pace: newPace,
        pitchVariance: newStress > 0.3 ? 0.6 : 0.3,
        stressLevel: newStress,
        confidence: 0.7,
      };

      const newEmotionalState = classifyEmotionalState(metrics);

      setVoiceMetrics(metrics);
      setStressLevel(newStress);
      setEmotionalState((prev) => {
        if (prev !== newEmotionalState) {
          setEmotionalStateTransitions((transitions) => [
            ...transitions,
            { time: new Date().toISOString(), state: newEmotionalState },
          ]);
        }
        return newEmotionalState;
      });
      setPeakStressLevel((prev) => Math.max(prev, newStress));
    }
    } catch (err) {
      console.error("[gemini-live] Error in sidecar message handler:", err);
    }
  }, []);

  // ── Connect ──────────────────────────────────────────────────────

  const connect = useCallback(async () => {
    if (disconnectingRef.current) return;
    setError(null);
    setConnectionState("connecting");

    try {
      // 1. Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      mediaStreamRef.current = stream;

      // 2. Fetch ephemeral tokens (after mic permission to avoid token expiry)
      const tokenHeaders: Record<string, string> = {};
      if (isDemo) tokenHeaders[DEMO_HEADER_NAME] = "1";
      const tokenRes = await fetch("/api/voice/token", { method: "POST", headers: tokenHeaders });
      if (!tokenRes.ok) {
        const body = await tokenRes.json().catch(() => ({}));
        throw new Error(
          (body as Record<string, string>).error ??
            "Failed to get voice tokens"
        );
      }
      const tokens = (await tokenRes.json()) as {
        primaryToken: string;
        sidecarToken: string;
        primaryModel: string;
        sidecarModel: string;
      };

      // 3. Set up audio capture at 16kHz (required by Gemini Live API)
      const audioCtx = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioCtx;
      // iOS Safari creates AudioContext in "suspended" state — must resume
      // inside a user-gesture callback (this runs from a click handler).
      if (audioCtx.state === "suspended") {
        await audioCtx.resume();
      }
      if (audioCtx.sampleRate !== 16000) {
        console.warn(
          `[gemini-live] Browser using ${audioCtx.sampleRate}Hz instead of 16000Hz — audio may not work`
        );
      }
      console.log(`[gemini-live] AudioContext sample rate: ${audioCtx.sampleRate}Hz`);

      await audioCtx.audioWorklet.addModule("/audio-worklet-processor.js");

      const source = audioCtx.createMediaStreamSource(stream);
      const workletNode = new AudioWorkletNode(audioCtx, "pcm-processor");
      workletNodeRef.current = workletNode;
      source.connect(workletNode);
      // Don't connect to destination — we don't want to hear our own mic

      // 4. Connect primary session (3.1 Flash Live)
      const primaryAI = new GoogleGenAI({
          apiKey: tokens.primaryToken,
          httpOptions: { apiVersion: "v1alpha" },
        });
      const primarySession = await primaryAI.live.connect({
        model: tokens.primaryModel,
        config: buildPrimarySDKConfig() as Parameters<
          typeof primaryAI.live.connect
        >[0]["config"],
        callbacks: {
          onopen: () => {
            console.log("[gemini-live] Primary connected");
            setConnectionState("connected");
            setIsCapturing(true);
          },
          onmessage: handlePrimaryMessage,
          onerror: (e: ErrorEvent) => {
            console.error("[gemini-live] Primary error:", e.message);
            setError(e.message);
            setConnectionState("error");
            onErrorRef.current?.(e.message);
          },
          onclose: (e: CloseEvent) => {
            console.log("[gemini-live] Primary closed — code:", e.code, "reason:", e.reason);
            primaryReadyRef.current = false;
            if (!disconnectingRef.current) {
              setConnectionState("disconnected");
              setIsCapturing(false);
            }
          },
        },
      });
      primarySessionRef.current = primarySession;
      // SDK's connect() resolves after setupComplete — session is ready
      primaryReadyRef.current = true;
      console.log("[gemini-live] Primary setup complete — ready for audio");

      // 5. Sidecar disabled temporarily to isolate primary connection issue.
      // TODO: Re-enable once primary voice connection is stable.
      // try {
      //   const sidecarAI = new GoogleGenAI({
      //     apiKey: tokens.sidecarToken,
      //     httpOptions: { apiVersion: "v1alpha" },
      //   });
      //   const sidecarSession = await sidecarAI.live.connect({
      //     model: tokens.sidecarModel,
      //     config: buildSidecarSDKConfig() as Parameters<
      //       typeof sidecarAI.live.connect
      //     >[0]["config"],
      //     callbacks: {
      //       onopen: () => {
      //         console.log("[gemini-live] Sidecar connected");
      //         setSidecarStatus({ connected: true, receiving: false });
      //       },
      //       onmessage: handleSidecarMessage,
      //       onerror: (e: ErrorEvent) => {
      //         console.warn("[gemini-live] Sidecar error:", e.message);
      //         setSidecarStatus({ connected: false, receiving: false });
      //       },
      //       onclose: (e: CloseEvent) => {
      //         console.log("[gemini-live] Sidecar closed — code:", e.code, "reason:", e.reason);
      //         sidecarReadyRef.current = false;
      //         setSidecarStatus({ connected: false, receiving: false });
      //       },
      //     },
      //   });
      //   sidecarSessionRef.current = sidecarSession;
      //   sidecarReadyRef.current = true;
      //   console.log("[gemini-live] Sidecar setup complete — ready for audio");
      // } catch (sidecarErr) {
      //   console.warn("[gemini-live] Sidecar failed to connect:", sidecarErr);
      //   setSidecarStatus({ connected: false, receiving: false });
      // }
      console.log("[gemini-live] Sidecar disabled for debugging — primary only");

      // 6. Wire audio worklet → both sessions
      let chunkCount = 0;
      workletNode.port.onmessage = (event: MessageEvent) => {
        const { event: eventType, data } = event.data as {
          event: string;
          data: { int16arrayBuffer?: ArrayBuffer; rms?: number };
        };

        if (eventType === "level" && data.rms !== undefined) {
          // Clamp to 0-1 with some amplification for visibility
          setInputLevel(Math.min(1, data.rms * 5));
        }

        if (eventType === "chunk" && data.int16arrayBuffer) {
          const base64 = int16BufferToBase64(data.int16arrayBuffer);
          const audioData = {
            data: base64,
            mimeType: "audio/pcm;rate=16000",
          };
          // Only send audio after setup is complete and session is alive
          if (primaryReadyRef.current && primarySessionRef.current) {
            try {
              primarySessionRef.current.sendRealtimeInput({ audio: audioData });
              chunkCount++;
              if (chunkCount === 1) {
                console.log("[gemini-live] First audio chunk sent — size:", base64.length, "bytes base64");
              }
              if (chunkCount % 100 === 0) {
                console.log(`[gemini-live] Audio chunks sent: ${chunkCount}`);
              }
            } catch (err) {
              console.warn("[gemini-live] Audio send failed:", err);
            }
          } else {
            // Log why we're not sending (first occurrence only)
            if (!primaryReadyRef.current) {
              console.warn("[gemini-live] Skipping audio: primary not ready");
            }
          }
          if (sidecarReadyRef.current && sidecarSessionRef.current) {
            try {
              sidecarSessionRef.current.sendRealtimeInput({ audio: audioData });
            } catch {
              // WebSocket may have closed — ignore
            }
          }
        }
      };

      // Trigger the model's initial greeting from the system instruction.
      // Placed after audio pipeline is wired so mic audio is already flowing
      // when the model starts responding. Wrapped in try-catch so a failure
      // doesn't tear down the session (model will respond to audio instead).
      try {
        primarySession.sendClientContent({ turnComplete: true });
      } catch {
        // Non-critical — model will respond once it receives audio input
      }

      console.log(
        "[gemini-live] Voice session fully initialized — primary:",
        !!primarySessionRef.current,
        "sidecar:",
        !!sidecarSessionRef.current
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to connect";
      console.error("[gemini-live] Connect failed:", message);
      setError(message);
      setConnectionState("error");
      onErrorRef.current?.(message);

      // Clean up any partial state
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
  }, [handlePrimaryMessage, isDemo]);

  // ── Disconnect ───────────────────────────────────────────────────

  const disconnect = useCallback(() => {
    disconnectingRef.current = true;
    primaryReadyRef.current = false;
    sidecarReadyRef.current = false;

    // Close sessions
    try {
      primarySessionRef.current?.close();
    } catch {
      /* already closed */
    }
    try {
      sidecarSessionRef.current?.close();
    } catch {
      /* already closed */
    }
    primarySessionRef.current = null;
    sidecarSessionRef.current = null;

    // Stop mic
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;

    // Disconnect worklet
    workletNodeRef.current?.disconnect();
    workletNodeRef.current = null;

    // Close audio contexts
    audioContextRef.current?.close().catch(() => {});
    audioContextRef.current = null;
    playbackContextRef.current?.close().catch(() => {});
    playbackContextRef.current = null;

    // Stop any playing audio
    stopPlayback();

    // Reset state
    setConnectionState("disconnected");
    setSidecarStatus({ connected: false, receiving: false });
    setIsCapturing(false);
    setIsSpeaking(false);
    setInputLevel(0);
    setEmotionalState("calm");
    setStressLevel(0);
    setVoiceMetrics(DEFAULT_METRICS);
    setError(null);

    disconnectingRef.current = false;
  }, [stopPlayback]);

  // ── Send text (typed input during voice session) ─────────────────

  const sendText = useCallback((message: string) => {
    // 3.1 only supports sendClientContent for initial history seeding,
    // so use sendRealtimeInput with text for real-time input.
    primarySessionRef.current?.sendRealtimeInput({ text: message });
  }, []);

  // ── Cleanup on unmount ───────────────────────────────────────────

  useEffect(() => {
    return () => {
      disconnectingRef.current = true;
      try {
        primarySessionRef.current?.close();
      } catch {
        /* noop */
      }
      try {
        sidecarSessionRef.current?.close();
      } catch {
        /* noop */
      }
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      audioContextRef.current?.close().catch(() => {});
      playbackContextRef.current?.close().catch(() => {});
    };
  }, []);

  return {
    connectionState,
    sidecarStatus,
    isCapturing,
    isSpeaking,
    inputLevel,
    emotionalState,
    stressLevel,
    voiceMetrics,
    emotionalStateTransitions,
    toolCallOutcomes,
    peakStressLevel,
    volume,
    setVolume: handleSetVolume,
    connect,
    disconnect,
    sendText,
    error,
  };
}
