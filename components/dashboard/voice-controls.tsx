"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { MicIcon, MicOffIcon, ActivityIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { EmotionalState } from "@/lib/voice/types";

// ── Types ────────────────────────────────────────────────────────────

interface VoiceControlsProps {
  /** Whether voice mode is currently active. */
  isActive: boolean;
  /** Current emotional state detected from voice. */
  emotionalState?: EmotionalState;
  /** Current stress level (0-1). */
  stressLevel?: number;
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

// ── Audio visualizer bars ────────────────────────────────────────────

/** Deterministic bar heights based on index — avoids impure Math.random in render. */
const BAR_HEIGHTS = [12, 10, 16, 9, 14];

function AudioVisualizer({ isActive }: { isActive: boolean }) {
  return (
    <div className="flex items-center gap-0.5 h-4">
      {BAR_HEIGHTS.map((height, i) => (
        <div
          key={i}
          className={cn(
            "w-0.5 rounded-full bg-primary transition-all duration-150",
            isActive ? "animate-pulse" : "h-1"
          )}
          style={{
            height: isActive ? `${height}px` : "4px",
            animationDelay: `${i * 100}ms`,
            animationDuration: `${600 + i * 100}ms`,
          }}
        />
      ))}
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────

export function VoiceControls({
  isActive,
  emotionalState,
  stressLevel,
  disabled = false,
  onActivate,
  onDeactivate,
}: VoiceControlsProps) {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  const handleToggle = useCallback(() => {
    if (disabled || isTransitioning) return;

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
  }, [isActive, disabled, isTransitioning, onActivate, onDeactivate]);

  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="flex items-center gap-2">
      {/* Stress/emotional state indicator */}
      {isActive && stressLevel !== undefined && (
        <div className="flex items-center gap-1.5">
          <ActivityIcon
            className={cn(
              "size-3.5",
              getStressColor(stressLevel)
            )}
          />
          <span className="text-[10px] text-muted-foreground">
            {getStressLabel(emotionalState)}
          </span>
        </div>
      )}

      {/* Audio visualizer */}
      {isActive && <AudioVisualizer isActive={isActive} />}

      {/* Mic toggle button */}
      <Button
        variant={isActive ? "default" : "outline"}
        size="icon"
        onClick={handleToggle}
        disabled={disabled || isTransitioning}
        className={cn(
          "relative",
          isActive && "bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
        )}
        aria-label={isActive ? "Stop voice input" : "Start voice input"}
      >
        {isActive ? (
          <MicOffIcon className="size-4" />
        ) : (
          <MicIcon className="size-4" />
        )}

        {/* Pulsing ring when active */}
        {isActive && (
          <span className="absolute -inset-0.5 rounded-lg border-2 border-red-400/50 animate-ping dark:border-red-500/40" style={{ animationDuration: "2s" }} />
        )}
      </Button>
    </div>
  );
}
