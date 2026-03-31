"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import {
  ArrowRightIcon,
  LoaderIcon,
  CheckCircleIcon,
  MicIcon,
  MicOffIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { VoiceControls } from "@/components/dashboard/voice-controls";
import { useWorkspace } from "./workspace-provider";
import type {
  EmotionalState,
  GeminiLiveConnectionState,
  SidecarStatus,
} from "@/lib/voice/types";

// Chips prefill the input with a template — user must complete the detail
const SINGLE_CHIPS = [
  { label: "Change price", prefill: "Change price to $" },
  { label: "Toggle promo", prefill: "Toggle promo status" },
  { label: "View history", prefill: "Show change history" },
];
const MULTI_CHIPS = [
  { label: "Bulk price change", prefill: "Change all prices by " },
  { label: "Compare", prefill: "Compare selected products" },
  { label: "Toggle promo", prefill: "Toggle promo status" },
];

interface IntentBarProps {
  voiceActive: boolean;
  voiceConnecting: boolean;
  onVoiceActivate: () => void;
  onVoiceDeactivate: () => void;
  emotionalState?: EmotionalState;
  stressLevel?: number;
  inputLevel?: number;
  connectionState?: GeminiLiveConnectionState;
  isSpeaking?: boolean;
  sidecarStatus?: SidecarStatus;
  volume?: number;
  onVolumeChange?: (volume: number) => void;
}

export function IntentBar({
  voiceActive,
  voiceConnecting,
  onVoiceActivate,
  onVoiceDeactivate,
  emotionalState,
  stressLevel,
  inputLevel,
  connectionState,
  isSpeaking,
  sidecarStatus,
  volume,
  onVolumeChange,
}: IntentBarProps) {
  const {
    products,
    selectedIds,
    phase,
    submitIntent,
    cancelDraft,
    draftChangeset,
    executionError,
  } = useWorkspace();
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedProducts = useMemo(
    () => products.filter((p) => selectedIds.has(p.id)),
    [products, selectedIds],
  );

  const placeholder = useMemo(() => {
    if (voiceActive || voiceConnecting) return "Listening...";
    if (draftChangeset && (phase === "preview" || phase === "executing")) {
      return "Review changeset above";
    }
    if (phase === "complete") return "Changes applied";
    if (selectedProducts.length === 0)
      return "What would you like to change?";
    if (selectedProducts.length === 1)
      return `${selectedProducts[0].name} — what to change?`;
    return `${selectedProducts.length} products — what to change?`;
  }, [selectedProducts, draftChangeset, phase, voiceActive, voiceConnecting]);

  const chips = useMemo(() => {
    if (selectedProducts.length === 0) return [];
    if (selectedProducts.length === 1) return SINGLE_CHIPS;
    return MULTI_CHIPS;
  }, [selectedProducts.length]);

  const handleSubmit = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || phase === "executing" || phase === "preview") return;
      setInput("");
      submitIntent(trimmed);
    },
    [phase, submitIntent],
  );

  const isBusy = phase === "executing" || phase === "preview";
  const hasDraft = !!draftChangeset && phase === "preview";

  return (
    <div className="intent-bar border-t pb-safe">
      {/* Busy indicator */}
      {phase === "executing" && (
        <div className="flex items-center gap-2 px-4 pt-2 text-xs text-muted-foreground">
          <LoaderIcon className="size-3 animate-spin" />
          <span>Executing changes...</span>
        </div>
      )}

      {/* Completion indicator */}
      {phase === "complete" && (
        <div className="flex items-center gap-2 px-4 pt-2 text-xs text-emerald-600 dark:text-emerald-400">
          <CheckCircleIcon className="size-3" />
          <span>Changes applied successfully</span>
        </div>
      )}

      {/* Error indicator */}
      {phase === "error" && (
        <div className="flex items-center gap-2 px-4 pt-2 text-xs text-destructive">
          <span>{executionError ?? "Something went wrong."}</span>
          <button
            type="button"
            className="underline hover:no-underline"
            onClick={cancelDraft}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Voice controls — expanded dock when voice is active */}
      {(voiceActive || voiceConnecting) && (
        <div className="px-3 pt-2">
          <VoiceControls
            isActive={voiceActive}
            emotionalState={emotionalState}
            stressLevel={stressLevel}
            inputLevel={inputLevel}
            connectionState={connectionState}
            isSpeaking={isSpeaking}
            sidecarStatus={sidecarStatus}
            disabled={isBusy}
            onActivate={onVoiceActivate}
            onDeactivate={onVoiceDeactivate}
            volume={volume}
            onVolumeChange={onVolumeChange}
          />
        </div>
      )}

      {/* Selection-based suggestion chips — prefill input, don't auto-submit */}
      {!hasDraft && chips.length > 0 && !isBusy && phase !== "complete" && !voiceActive && !voiceConnecting && (
        <div className="flex gap-1.5 overflow-x-auto px-4 pt-2 pb-1 scrollbar-none">
          {chips.map((chip) => (
            <button
              key={chip.label}
              type="button"
              className="intent-suggestion shrink-0 min-h-[32px]"
              onClick={() => {
                setInput(chip.prefill);
                inputRef.current?.focus();
              }}
              disabled={isBusy}
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}

      {/* Input row */}
      <div className="flex items-center gap-2 px-3 py-2 md:px-4">
        {/* Voice button — activates/deactivates Gemini Live voice */}
        <Button
          variant="ghost"
          size="icon"
          className="min-h-[44px] min-w-[44px] shrink-0 text-muted-foreground"
          aria-label={voiceActive ? "Stop voice" : "Start voice"}
          onClick={voiceActive ? onVoiceDeactivate : onVoiceActivate}
          disabled={isBusy || phase === "complete" || voiceConnecting}
        >
          {voiceConnecting ? (
            <LoaderIcon className="size-5 animate-spin" />
          ) : voiceActive ? (
            <MicOffIcon className="size-5 text-destructive" />
          ) : (
            <MicIcon className="size-5" />
          )}
        </Button>

        {/* Text input */}
        <input
          ref={inputRef}
          type="text"
          className="flex-1 bg-transparent text-base placeholder:text-muted-foreground focus:outline-none md:text-sm"
          placeholder={placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSubmit(input);
            }
          }}
          disabled={isBusy || phase === "complete" || voiceActive || voiceConnecting}
        />

        {/* Go button */}
        <Button
          variant="ghost"
          size="icon"
          className="min-h-[44px] min-w-[44px] shrink-0"
          aria-label="Submit"
          disabled={isBusy || phase === "complete" || !input.trim() || voiceActive || voiceConnecting}
          onClick={() => handleSubmit(input)}
        >
          {isBusy ? (
            <LoaderIcon className="size-5 animate-spin" />
          ) : (
            <ArrowRightIcon className="size-5" />
          )}
        </Button>
      </div>
    </div>
  );
}
