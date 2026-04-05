"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import {
  LoaderIcon,
  CheckCircleIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VoiceControls } from "@/components/dashboard/voice-controls";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";
import { useLayout } from "@/components/dashboard/layout-shell";
import { useWorkspace, type WorkspacePhase } from "./workspace-provider";
import type {
  EmotionalState,
  GeminiLiveConnectionState,
  SidecarStatus,
} from "@/lib/voice/types";
import type { PipelinePhase } from "@/lib/pipeline-phase";

/** Map workspace phase to pipeline phase so VoiceControls demo affect works. */
function toPipelinePhase(wp: WorkspacePhase): PipelinePhase {
  if (wp === "preview") return "draft";
  return wp;
}

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
    infoResponse,
    dismissInfo,
  } = useWorkspace();
  const { isDemo } = useLayout();
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();
  const pipelinePhase = toPipelinePhase(phase);

  const selectedProducts = useMemo(
    () => products.filter((p) => selectedIds.has(p.id)),
    [products, selectedIds],
  );

  const placeholder = useMemo(() => {
    if (voiceActive || voiceConnecting) return "Listening... or type here";
    if (draftChangeset && (phase === "preview" || phase === "executing")) {
      return "Review changeset above";
    }
    if (phase === "complete" && infoResponse) return "Ask another question or describe a change...";
    if (phase === "complete") return "Changes applied";
    if (selectedProducts.length === 0)
      return "Describe a commerce change...";
    if (selectedProducts.length === 1)
      return `${selectedProducts[0].name} — what to change?`;
    return `${selectedProducts.length} products — what to change?`;
  }, [selectedProducts, draftChangeset, phase, voiceActive, voiceConnecting, infoResponse]);

  const chips = useMemo(() => {
    if (selectedProducts.length === 0) return [];
    if (selectedProducts.length === 1) return SINGLE_CHIPS;
    return MULTI_CHIPS;
  }, [selectedProducts.length]);

  const handleSubmit = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || phase === "executing" || phase === "preview") return;
    if (phase === "complete" && !infoResponse) return;
    setInput("");
    submitIntent(trimmed);
  }, [input, phase, submitIntent, infoResponse]);

  const isBusy = phase === "executing" || phase === "preview";
  const hasDraft = !!draftChangeset && phase === "preview";
  const showMobileVoiceDock = isMobile && (voiceActive || voiceConnecting);

  return (
    <div>
      {/* Busy indicator */}
      {phase === "executing" && (
        <div className="flex items-center gap-2 px-4 pt-2 text-xs text-muted-foreground sm:px-6 lg:px-8">
          <LoaderIcon className="size-3 animate-spin" />
          <span>Executing changes...</span>
        </div>
      )}

      {/* Completion indicator (changeset executed) */}
      {phase === "complete" && !infoResponse && (
        <div className="flex items-center gap-2 px-4 pt-2 text-xs text-emerald-600 dark:text-emerald-400 sm:px-6 lg:px-8">
          <CheckCircleIcon className="size-3" />
          <span>Changes applied successfully</span>
        </div>
      )}

      {/* Informational response (read-only query / no operations) */}
      {phase === "complete" && infoResponse && (
        <div className="mx-4 mt-2 rounded-lg border bg-muted/50 p-3 text-sm sm:mx-6 lg:mx-8">
          <p className="text-foreground">{infoResponse.reasoning}</p>
          {infoResponse.readerText && (
            <pre className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">
              {infoResponse.readerText}
            </pre>
          )}
          {infoResponse.suggestions && infoResponse.suggestions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {infoResponse.suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="intent-suggestion shrink-0 min-h-[32px]"
                  onClick={() => {
                    setInput(s);
                    dismissInfo();
                    inputRef.current?.focus();
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            className="mt-1 text-xs text-muted-foreground underline hover:no-underline"
            onClick={dismissInfo}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error indicator */}
      {phase === "error" && (
        <div className="flex items-center gap-2 px-4 pt-2 text-xs text-destructive sm:px-6 lg:px-8">
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

      {/* Selection-based suggestion chips — prefill input, don't auto-submit */}
      {!hasDraft && chips.length > 0 && !isBusy && phase !== "complete" && !voiceActive && !voiceConnecting && (
        <div className="flex gap-1.5 overflow-x-auto px-4 pt-2 pb-1 scrollbar-none sm:px-6 lg:px-8">
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

      {/* Mobile voice dock — immersive bottom panel */}
      {showMobileVoiceDock && (
        <VoiceControls
          isActive={voiceActive}
          emotionalState={emotionalState}
          stressLevel={stressLevel}
          inputLevel={inputLevel}
          connectionState={connectionState}
          isSpeaking={isSpeaking}
          sidecarStatus={sidecarStatus}
          disabled={isBusy}
          volume={volume}
          onVolumeChange={onVolumeChange}
          onActivate={onVoiceActivate}
          onDeactivate={onVoiceDeactivate}
          mobile
          phase={pipelinePhase}
          isDemo={isDemo}
        />
      )}

      {/* Input bar — hidden when mobile voice dock is active */}
      {!showMobileVoiceDock && (
        <div className="glass-elevated input-glow border-t px-4 py-4 pb-safe sm:px-6 lg:px-8">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="mx-auto max-w-4xl flex gap-2 sm:gap-3"
          >
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={placeholder}
              disabled={isBusy || (phase === "complete" && !infoResponse)}
              className="flex-1"
            />
            <VoiceControls
              isActive={voiceActive}
              emotionalState={emotionalState}
              stressLevel={stressLevel}
              inputLevel={inputLevel}
              connectionState={connectionState}
              isSpeaking={isSpeaking}
              sidecarStatus={sidecarStatus}
              disabled={isBusy}
              volume={volume}
              onVolumeChange={onVolumeChange}
              onActivate={onVoiceActivate}
              onDeactivate={onVoiceDeactivate}
              phase={pipelinePhase}
              isDemo={isDemo}
            />
            <Button
              type="submit"
              disabled={!input.trim() || isBusy}
              className="min-h-[44px] min-w-[44px] sm:min-h-9 sm:min-w-9"
            >
              <span className="hidden sm:inline">Send</span>
              <span className="sm:hidden">Go</span>
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
