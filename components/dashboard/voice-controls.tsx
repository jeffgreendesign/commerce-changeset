"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { MicIcon, MicOffIcon, ActivityIcon, Loader2Icon, Volume2Icon } from "lucide-react";
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
  /** Current output volume (0-1). */
  volume?: number;
  /** Called when user adjusts volume. */
  onVolumeChange?: (volume: number) => void;
  /** Render as mobile voice dock (expanded layout). */
  mobile?: boolean;
}

// ── Stress indicator colors ──────────────────────────────────────────

function getStressColor(level: number): string {
  if (level > 0.7) return "text-red-500 dark:text-red-400";
  if (level > 0.4) return "text-amber-500 dark:text-amber-400";
  return "text-green-500 dark:text-green-400";
}

function getStressBarColor(level: number): string {
  if (level > 0.7) return "bg-red-500 dark:bg-red-400";
  if (level > 0.4) return "bg-amber-500 dark:bg-amber-400";
  return "bg-green-500 dark:bg-green-400";
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

function getStressChipColor(state?: EmotionalState): string {
  switch (state) {
    case "stressed":
      return "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300";
    case "rushed":
      return "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300";
    case "uncertain":
      return "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300";
    case "calm":
      return "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300";
    default:
      return "bg-muted text-muted-foreground";
  }
}

// ── Dynamic audio visualizer ─────────────────────────────────────────

const MOBILE_BAR_OFFSETS = [0.6, 0.75, 0.85, 0.95, 1.0, 0.9, 0.8, 0.7, 0.55];
const INLINE_BAR_OFFSETS = [0.8, 0.6, 1.0, 0.55, 0.85];

function AudioVisualizer({
  isActive,
  inputLevel = 0,
  isSpeaking = false,
  mobile = false,
  stressLevel = 0,
}: {
  isActive: boolean;
  inputLevel?: number;
  isSpeaking?: boolean;
  mobile?: boolean;
  stressLevel?: number;
}) {
  const offsets = mobile ? MOBILE_BAR_OFFSETS : INLINE_BAR_OFFSETS;
  const barWidth = mobile ? "w-1.5" : "w-0.5";
  const maxHeight = mobile ? 32 : 14;
  const minHeight = mobile ? 6 : 4;
  const barColor = mobile ? getStressBarColor(stressLevel) : undefined;

  return (
    <div className={cn("flex items-center gap-0.5", mobile ? "h-8 gap-1" : "h-4")}>
      {offsets.map((offset, i) => {
        const height = isActive
          ? isSpeaking
            ? minHeight + offset * (maxHeight * 0.7)
            : minHeight + inputLevel * offset * maxHeight
          : minHeight;

        return (
          <div
            key={i}
            className={cn(
              "rounded-full transition-all duration-75",
              barWidth,
              mobile
                ? barColor
                : isActive && isSpeaking
                  ? "bg-blue-500 dark:bg-blue-400 animate-pulse"
                  : isActive
                    ? "bg-green-500 dark:bg-green-400"
                    : "bg-muted-foreground/30"
            )}
            style={{
              height: `${height}px`,
              ...(isActive && isSpeaking && !mobile
                ? {
                    animationDelay: `${i * 100}ms`,
                    animationDuration: `${800 + i * 100}ms`,
                  }
                : {}),
              ...(mobile
                ? {
                    filter: isActive
                      ? `drop-shadow(0 0 3px ${stressLevel > 0.7 ? "rgb(239 68 68 / 0.4)" : stressLevel > 0.4 ? "rgb(245 158 11 / 0.4)" : "rgb(34 197 94 / 0.4)"})`
                      : undefined,
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
  mobile = false,
}: {
  state?: GeminiLiveConnectionState;
  sidecarStatus?: SidecarStatus;
  mobile?: boolean;
}) {
  if (!state || state === "disconnected") return null;

  if (mobile && (state === "connecting" || state === "reconnecting")) {
    return (
      <div className="absolute top-0 left-0 right-0 h-0.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-1/3 animate-shimmer rounded-full bg-primary" />
      </div>
    );
  }

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

// ── Mobile Voice Dock ────────────────────────────────────────────────

function MobileVoiceDock({
  isActive,
  emotionalState,
  stressLevel = 0,
  inputLevel = 0,
  connectionState,
  isSpeaking = false,
  sidecarStatus,
  disabled = false,
  volume,
  onVolumeChange,
  onToggle,
  isConnecting,
  isTransitioning,
}: {
  isActive: boolean;
  emotionalState?: EmotionalState;
  stressLevel?: number;
  inputLevel?: number;
  connectionState?: GeminiLiveConnectionState;
  isSpeaking?: boolean;
  sidecarStatus?: SidecarStatus;
  disabled?: boolean;
  volume?: number;
  onVolumeChange?: (volume: number) => void;
  onToggle: () => void;
  isConnecting: boolean;
  isTransitioning: boolean;
}) {
  return (
    <div className="glass relative flex flex-col items-center gap-3 border-t px-6 py-4 pb-safe animate-voice-dock-enter">
      <ConnectionIndicator state={connectionState} sidecarStatus={sidecarStatus} mobile />

      {/* Emotional state chip */}
      {isActive && sidecarStatus?.receiving && (
        <div
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
            getStressChipColor(emotionalState),
          )}
        >
          <ActivityIcon className={cn("size-3", getStressColor(stressLevel))} />
          {getStressLabel(emotionalState)}
        </div>
      )}

      {/* Visualizer + mic button */}
      <div className="flex items-center gap-4">
        <AudioVisualizer
          isActive={isActive}
          inputLevel={inputLevel}
          isSpeaking={isSpeaking}
          mobile
          stressLevel={stressLevel}
        />

        <Button
          variant={isActive ? "default" : "outline"}
          size="lg"
          onClick={onToggle}
          disabled={disabled || isTransitioning || isConnecting}
          className={cn(
            "relative h-16 w-16 rounded-full",
            isActive &&
              "bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700",
            isConnecting && "opacity-70"
          )}
          aria-label={isActive ? "Stop voice input" : "Start voice input"}
        >
          {isConnecting ? (
            <Loader2Icon className="size-6 animate-spin" />
          ) : isActive ? (
            <MicOffIcon className="size-6" />
          ) : (
            <MicIcon className="size-6" />
          )}

          {isActive && (
            <span
              className="absolute -inset-1 rounded-full border-2 border-red-400/50 animate-ping dark:border-red-500/40"
              style={{ animationDuration: "2s" }}
            />
          )}
        </Button>

        <AudioVisualizer
          isActive={isActive}
          inputLevel={inputLevel}
          isSpeaking={isSpeaking}
          mobile
          stressLevel={stressLevel}
        />
      </div>

      {/* Volume slider */}
      {isActive && onVolumeChange && (
        <div className="flex w-full max-w-[200px] items-center gap-2">
          <Volume2Icon className="size-3.5 shrink-0 text-muted-foreground" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume ?? 1}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="h-1 w-full accent-primary"
            aria-label="Output volume"
          />
        </div>
      )}

      <span className="text-xs text-muted-foreground">
        {isActive ? "Tap to stop" : "Tap to speak"}
      </span>
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
  volume,
  onVolumeChange,
  onActivate,
  onDeactivate,
  mobile = false,
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

  // Mobile voice dock — full-width immersive layout
  if (mobile && (isActive || isConnecting)) {
    return (
      <MobileVoiceDock
        isActive={isActive}
        emotionalState={emotionalState}
        stressLevel={stressLevel}
        inputLevel={inputLevel}
        connectionState={connectionState}
        isSpeaking={isSpeaking}
        sidecarStatus={sidecarStatus}
        disabled={disabled}
        volume={volume}
        onVolumeChange={onVolumeChange}
        onToggle={handleToggle}
        isConnecting={isConnecting}
        isTransitioning={isTransitioning}
      />
    );
  }

  // Inline layout (desktop + mobile when inactive)
  return (
    <div className="flex items-center gap-2">
      {/* Connection state indicator */}
      <ConnectionIndicator state={connectionState} sidecarStatus={sidecarStatus} />

      {/* Stress/emotional state indicator — hidden on mobile to save space */}
      {isActive && stressLevel !== undefined && sidecarStatus?.receiving && (
        <div className="hidden items-center gap-1.5 sm:flex">
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

      {/* Volume slider (inline) */}
      {isActive && onVolumeChange && (
        <div className="hidden items-center gap-1.5 sm:flex">
          <Volume2Icon className="size-3 text-muted-foreground" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume ?? 1}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="h-1 w-16 accent-primary"
            aria-label="Output volume"
          />
        </div>
      )}

      {/* Mic toggle button */}
      <Button
        variant={isActive ? "default" : "outline"}
        size="icon"
        onClick={handleToggle}
        disabled={disabled || isTransitioning || isConnecting}
        className={cn(
          "relative min-h-[44px] min-w-[44px]",
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
