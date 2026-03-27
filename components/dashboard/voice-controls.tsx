"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { MicIcon, MicOffIcon, ActivityIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  EmotionalState,
  GeminiLiveConnectionState,
  SidecarStatus,
} from "@/lib/voice/types";

// ── Types ────────────────────────────────────────────────────────────

interface VoiceControlsProps {
  /** Whether voice mode is currently active. */
  isActive: boolean;
  /** Current emotional state detected from voice. */
  emotionalState?: EmotionalState;
  /** Current stress level (0-1). */
  stressLevel?: number;
  /** Real-time mic input level (0-1) for visualizer. */
  inputLevel?: number;
  /** WebSocket connection state. */
  connectionState?: GeminiLiveConnectionState;
  /** Whether Gemini is currently speaking. */
  isSpeaking?: boolean;
  /** Sidecar (affect analysis) connection status. */
  sidecarStatus?: SidecarStatus;
  /** Whether the system is busy processing. */
  disabled?: boolean;
  /** Called when user toggles voice mode on. */
  onActivate: () => void;
  /** Called when user toggles voice mode off. */
  onDeactivate: () => void;
}

// ── Stress indicator colors ──────────────────────────────────────────

function getStressColor(level: number): string {
  if (level > 0.7) return "text-red-500 dark:text-red-400";
  if (level > 0.4) return "text-amber-500 dark:text-amber-400";
  return "text-green-500 dark:text-green-400";
}

function getStressLabel(state?: EmotionalState): string {
  switch (state) {
    case "stressed":
      return "Elevated stress detected";
    case "rushed":
      return "Fast pace detected";
    case "uncertain":
      return "Uncertainty detected";
    case "calm":
      return "Calm";
    default:
      return "Voice active";
  }
}

// ── Dynamic audio visualizer ─────────────────────────────────────────

const BAR_OFFSETS = [0.8, 0.6, 1.0, 0.55, 0.85]; // varied heights per bar

function AudioVisualizer({
  isActive,
  inputLevel = 0,
  isSpeaking = false,
}: {
  isActive: boolean;
  inputLevel?: number;
  isSpeaking?: boolean;
}) {
  return (
    <div className="flex items-center gap-0.5 h-4">
      {BAR_OFFSETS.map((offset, i) => {
        // Scale bars by input level when user is talking,
        // use a gentle pulse when Gemini is speaking
        const height = isActive
          ? isSpeaking
            ? 4 + offset * 12 // gentle varied heights during playback
            : 4 + inputLevel * offset * 14 // mic-driven
          : 4;

        return (
          <div
            key={i}
            className={cn(
              "w-0.5 rounded-full transition-all duration-75",
              isActive && isSpeaking
                ? "bg-blue-500 dark:bg-blue-400 animate-pulse"
                : isActive
                  ? "bg-green-500 dark:bg-green-400"
                  : "bg-muted-foreground/30"
            )}
            style={{
              height: `${height}px`,
              ...(isActive && isSpeaking
                ? {
                    animationDelay: `${i * 100}ms`,
                    animationDuration: `${800 + i * 100}ms`,
                  }
                : {}),
            }}
          />
        );
      })}
    </div>
  );
}

// ── Connection state label ───────────────────────────────────────────

function ConnectionIndicator({
  state,
  sidecarStatus,
}: {
  state?: GeminiLiveConnectionState;
  sidecarStatus?: SidecarStatus;
}) {
  if (!state || state === "disconnected") return null;

  return (
    <div className="flex items-center gap-1.5">
      {state === "connecting" && (
        <>
          <Loader2Icon className="size-3 animate-spin text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">Connecting...</span>
        </>
      )}
      {state === "reconnecting" && (
        <>
          <div className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-[10px] text-amber-600 dark:text-amber-400">
            Reconnecting...
          </span>
        </>
      )}
      {state === "error" && (
        <>
          <div className="size-1.5 rounded-full bg-red-500" />
          <span className="text-[10px] text-red-600 dark:text-red-400">
            Connection error
          </span>
        </>
      )}
      {state === "connected" && sidecarStatus && (
        <div
          className="flex items-center gap-1"
          title={
            sidecarStatus.connected
              ? "Emotion detection active"
              : "Emotion detection unavailable"
          }
        >
          <div
            className={cn(
              "size-1.5 rounded-full",
              sidecarStatus.connected && sidecarStatus.receiving
                ? "bg-green-500"
                : sidecarStatus.connected
                  ? "bg-green-500/50"
                  : "bg-muted-foreground/30"
            )}
          />
          {!sidecarStatus.connected && (
            <span className="text-[10px] text-muted-foreground">No affect</span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────

export function VoiceControls({
  isActive,
  emotionalState,
  stressLevel,
  inputLevel,
  connectionState,
  isSpeaking,
  sidecarStatus,
  disabled = false,
  onActivate,
  onDeactivate,
}: VoiceControlsProps) {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  const isConnecting = connectionState === "connecting";

  const handleToggle = useCallback(() => {
    if (disabled || isTransitioning || isConnecting) return;

    setIsTransitioning(true);

    if (isActive) {
      onDeactivate();
    } else {
      onActivate();
    }

    // Brief transition animation
    transitionTimeoutRef.current = setTimeout(() => {
      setIsTransitioning(false);
    }, 300);
  }, [isActive, disabled, isTransitioning, isConnecting, onActivate, onDeactivate]);

  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="flex items-center gap-2">
      {/* Connection state indicator */}
      <ConnectionIndicator state={connectionState} sidecarStatus={sidecarStatus} />

      {/* Stress/emotional state indicator */}
      {isActive && stressLevel !== undefined && sidecarStatus?.receiving && (
        <div className="flex items-center gap-1.5">
          <ActivityIcon
            className={cn("size-3.5", getStressColor(stressLevel))}
          />
          <span className="text-[10px] text-muted-foreground">
            {getStressLabel(emotionalState)}
          </span>
        </div>
      )}

      {/* Audio visualizer */}
      {(isActive || isConnecting) && (
        <AudioVisualizer
          isActive={isActive}
          inputLevel={inputLevel}
          isSpeaking={isSpeaking}
        />
      )}

      {/* Mic toggle button */}
      <Button
        variant={isActive ? "default" : "outline"}
        size="icon"
        onClick={handleToggle}
        disabled={disabled || isTransitioning || isConnecting}
        className={cn(
          "relative",
          isActive &&
            "bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700",
          isConnecting && "opacity-70"
        )}
        aria-label={isActive ? "Stop voice input" : "Start voice input"}
      >
        {isConnecting ? (
          <Loader2Icon className="size-4 animate-spin" />
        ) : isActive ? (
          <MicOffIcon className="size-4" />
        ) : (
          <MicIcon className="size-4" />
        )}

        {/* Pulsing ring when active */}
        {isActive && (
          <span
            className="absolute -inset-0.5 rounded-lg border-2 border-red-400/50 animate-ping dark:border-red-500/40"
            style={{ animationDuration: "2s" }}
          />
        )}
      </Button>
    </div>
  );
}
