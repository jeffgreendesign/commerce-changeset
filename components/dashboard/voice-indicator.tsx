"use client";

/**
 * VoiceIndicator — compact header badge showing voice connection state.
 *
 * Visible across all dashboard views so users always know when
 * the voice agent is active, regardless of the current view.
 */

import { MicIcon, MicOffIcon, Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVoice } from "@/components/dashboard/voice-provider";
import { useLayout } from "@/components/dashboard/layout-shell";

export function VoiceIndicator() {
  const {
    voiceActive,
    voiceConnecting,
    emotionalState,
    isCapturing,
    demoEmotionalState,
    handleVoiceDeactivate,
  } = useVoice();
  const { isDemo } = useLayout();

  // Nothing to show when disconnected and not connecting
  if (!voiceActive && !voiceConnecting) return null;

  const displayEmotionalState = isDemo ? demoEmotionalState : emotionalState;

  const emotionColor: Record<string, string> = {
    calm: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
    stressed: "bg-red-500/20 text-red-600 dark:text-red-400",
    rushed: "bg-amber-500/20 text-amber-600 dark:text-amber-400",
    uncertain: "bg-blue-500/20 text-blue-600 dark:text-blue-400",
  };

  return (
    <button
      type="button"
      onClick={() => void handleVoiceDeactivate()}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
        voiceConnecting
          ? "bg-muted text-muted-foreground"
          : emotionColor[displayEmotionalState] ?? emotionColor.calm,
      )}
      aria-label={voiceConnecting ? "Connecting voice" : "Disconnect voice"}
      aria-busy={voiceConnecting}
      title={voiceActive ? "Voice active — click to disconnect" : "Connecting..."}
    >
      {voiceConnecting ? (
        <Loader2Icon className="size-3 animate-spin" />
      ) : isCapturing ? (
        <MicIcon className="size-3 animate-pulse" />
      ) : (
        <MicOffIcon className="size-3" />
      )}
      <span className="hidden sm:inline">
        {voiceConnecting ? "Connecting" : "Voice"}
      </span>
    </button>
  );
}
