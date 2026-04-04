"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { MicIcon, MicOffIcon, ActivityIcon, Loader2Icon, Volume2Icon, LockKeyholeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  EmotionalState,
  GeminiLiveConnectionState,
  SidecarStatus,
} from "@/lib/voice/types";
import type { PipelinePhase } from "@/lib/pipeline-phase";

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
  /** Current pipeline phase (for Token Vault overlay in demo). */
  phase?: PipelinePhase;
  /** Whether demo mode is active. */
  isDemo?: boolean;
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

// ── Demo affect simulation ──────────────────────────────────────────

function demoAffectFromPhase(phase?: PipelinePhase): EmotionalState {
  switch (phase) {
    case "loading":
      return "rushed";
    case "draft":
      return "uncertain";
    case "executing":
    case "rolling_back":
      return "stressed";
    case "error":
      return "stressed";
    case "complete":
      return "calm";
    default:
      return "calm";
  }
}

function demoStressFromPhase(phase?: PipelinePhase): number {
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

// ── Token Vault status for voice mode (demo only) ───────────────────

function getTokenVaultMessage(phase?: PipelinePhase): string | null {
  switch (phase) {
    case "loading":
      return "Reader exchanging OBO token...";
    case "draft":
      return "Reader token exchanged";
    case "executing":
    case "rolling_back":
      return "Writer scoped to approved ops";
    case "complete":
      return "3 agents delegated, 0 credential leaks";
    default:
      return null;
  }
}

function VoiceTokenVaultStatus({ phase }: { phase?: PipelinePhase }) {
  const message = getTokenVaultMessage(phase);
  if (!message) return null;

  return (
    <div className="animate-step-enter inline-flex items-center gap-1.5 rounded-full border border-tv-border bg-tv-bg px-3 py-1 text-[11px] font-medium text-tv-text">
      <LockKeyholeIcon className="size-3 shrink-0" />
      Token Vault: {message}
    </div>
  );
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

  // On mobile, the affect chip already shows emotion detection status
  if (mobile && state === "connected") return null;

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
  phase,
  isDemo,
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
  phase?: PipelinePhase;
  isDemo?: boolean;
}) {
  return (
    <div className="glass relative flex flex-col gap-2 border-t px-4 py-3 pb-safe animate-voice-dock-enter">
      <ConnectionIndicator state={connectionState} sidecarStatus={sidecarStatus} mobile />

      {/* Compact layout: affect | visualizer | mic | visualizer | volume */}
      <div className="flex w-full flex-wrap items-center justify-center gap-x-3 gap-y-2">
        {/* Affect chip — left side */}
        {isActive && sidecarStatus?.receiving ? (
          <div
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
              getStressChipColor(emotionalState),
            )}
          >
            <ActivityIcon className={cn("size-2.5", getStressColor(stressLevel))} />
            {getStressLabel(emotionalState)}
          </div>
        ) : (
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {isConnecting ? "Connecting\u2026" : isActive ? "Tap to stop" : "Tap to speak"}
          </span>
        )}

        {/* Left visualizer — hidden on small phones */}
        <div className="hidden sm:flex">
          <AudioVisualizer
            isActive={isActive}
            inputLevel={inputLevel}
            isSpeaking={isSpeaking}
            mobile
            stressLevel={stressLevel}
          />
        </div>

        {/* Mic button — compact */}
        <Button
          type="button"
          variant={isActive ? "default" : "outline"}
          size="icon"
          onClick={onToggle}
          disabled={disabled || isTransitioning || isConnecting}
          className={cn(
            "relative h-14 w-14 shrink-0 rounded-full",
            isActive &&
              "bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 ring-2 ring-red-500/50",
            !isActive && !isConnecting && "animate-mic-prismatic border border-border/50",
            isConnecting && "opacity-70"
          )}
          aria-label={isActive ? "Stop voice input" : "Start voice input"}
        >
          {isConnecting ? (
            <Loader2Icon className="size-5 animate-spin" />
          ) : isActive ? (
            <MicOffIcon className="size-5" />
          ) : (
            <MicIcon className="size-5" />
          )}

          {isActive && (
            <span
              className="animate-mic-active-ring -inset-1 rounded-full"
            />
          )}
        </Button>

        {/* Right visualizer */}
        <AudioVisualizer
          isActive={isActive}
          inputLevel={inputLevel}
          isSpeaking={isSpeaking}
          mobile
          stressLevel={stressLevel}
        />

        {/* Volume slider — inline on sm+, hidden on small phones */}
        {isActive && onVolumeChange ? (
          <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
            <Volume2Icon className="size-3 text-muted-foreground" />
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume ?? 1}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="h-1 w-16 text-base accent-primary md:text-sm"
              aria-label="Output volume"
            />
          </div>
        ) : (
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {isConnecting ? "Connecting\u2026" : isActive ? "Tap to stop" : "Tap to speak"}
          </span>
        )}
      </div>

      {/* Volume slider — separate row on small phones */}
      {isActive && onVolumeChange && (
        <div className="flex w-full items-center justify-center gap-1.5 pb-1 sm:hidden">
          <Volume2Icon className="size-3 text-muted-foreground" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume ?? 1}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="h-1 w-32 text-base accent-primary"
            aria-label="Output volume"
          />
        </div>
      )}

      {/* Token Vault status (demo only) — below main row */}
      {isDemo && <VoiceTokenVaultStatus phase={phase} />}
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
  phase,
  isDemo,
}: VoiceControlsProps) {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  const isConnecting = connectionState === "connecting";

  // In demo mode, simulate sidecar connected and derive affect from phase
  const effectiveSidecarStatus: SidecarStatus | undefined = isDemo
    ? { connected: true, receiving: true }
    : sidecarStatus;
  const effectiveEmotionalState: EmotionalState | undefined = isDemo
    ? (emotionalState != null && emotionalState !== "calm" ? emotionalState : demoAffectFromPhase(phase))
    : emotionalState;
  const effectiveStressLevel = isDemo
    ? (stressLevel !== undefined && stressLevel > 0.2 ? stressLevel : demoStressFromPhase(phase))
    : stressLevel;

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
        emotionalState={effectiveEmotionalState}
        stressLevel={effectiveStressLevel}
        inputLevel={inputLevel}
        connectionState={connectionState}
        isSpeaking={isSpeaking}
        sidecarStatus={effectiveSidecarStatus}
        disabled={disabled}
        volume={volume}
        onVolumeChange={onVolumeChange}
        onToggle={handleToggle}
        isConnecting={isConnecting}
        isTransitioning={isTransitioning}
        phase={phase}
        isDemo={isDemo}
      />
    );
  }

  // Inline layout (desktop + mobile when inactive)
  return (
    <div className="flex items-center gap-2">
      {/* Connection state indicator */}
      <ConnectionIndicator state={connectionState} sidecarStatus={effectiveSidecarStatus} />

      {/* Token Vault status (demo only, inline) */}
      {isDemo && isActive && <VoiceTokenVaultStatus phase={phase} />}

      {/* Stress/emotional state indicator — hidden on mobile to save space */}
      {isActive && effectiveStressLevel !== undefined && effectiveSidecarStatus?.receiving && (
        <div className="hidden items-center gap-1.5 sm:flex">
          <ActivityIcon
            className={cn("size-3.5", getStressColor(effectiveStressLevel))}
          />
          <span className="text-[10px] text-muted-foreground">
            {getStressLabel(effectiveEmotionalState)}
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
            className="h-1 w-16 text-base accent-primary"
            aria-label="Output volume"
          />
        </div>
      )}

      {/* Mic toggle button */}
      <Button
        type="button"
        variant={isActive ? "default" : "outline"}
        size="icon"
        onClick={handleToggle}
        disabled={disabled || isTransitioning || isConnecting}
        className={cn(
          "relative min-h-[44px] min-w-[44px] overflow-hidden",
          isActive &&
            "bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 ring-2 ring-red-500/50",
          !isActive && !isConnecting && "animate-mic-prismatic border border-border/50",
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

        {/* Prismatic active ring */}
        {isActive && (
          <span
            className="animate-mic-active-ring -inset-1 rounded-lg"
          />
        )}
      </Button>
    </div>
  );
}
