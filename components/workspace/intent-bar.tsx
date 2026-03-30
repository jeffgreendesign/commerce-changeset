"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  ArrowRightIcon,
  LoaderIcon,
  CheckCircleIcon,
  MicIcon,
  MicOffIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "./workspace-provider";

const SINGLE_CHIPS = ["Change price", "Toggle promo", "View history"];
const MULTI_CHIPS = ["Bulk price change", "Compare", "Toggle promo"];

// ── Browser Speech Recognition type shim ────────────────────────────

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: Event) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

function getSpeechRecognition():
  | (new () => SpeechRecognitionLike)
  | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition) as
    | (new () => SpeechRecognitionLike)
    | undefined;
}

export function IntentBar() {
  const {
    products,
    selectedIds,
    phase,
    submitIntent,
    cancelDraft,
    draftChangeset,
  } = useWorkspace();
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  // Clean up speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
    };
  }, []);

  const selectedProducts = useMemo(
    () => products.filter((p) => selectedIds.has(p.id)),
    [products, selectedIds],
  );

  const placeholder = useMemo(() => {
    if (listening) return "Listening...";
    if (draftChangeset && (phase === "preview" || phase === "executing")) {
      const count = draftChangeset.operations.length;
      return `${count} product${count !== 1 ? "s" : ""} affected — use panel below`;
    }
    if (phase === "complete") return "Changes applied";
    if (selectedProducts.length === 0)
      return "Describe a change, or select products...";
    if (selectedProducts.length === 1)
      return `${selectedProducts[0].name} selected`;
    return `${selectedProducts.length} products selected`;
  }, [selectedProducts, draftChangeset, phase, listening]);

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

  const toggleVoice = useCallback(() => {
    // Stop listening
    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
      return;
    }

    const SpeechRec = getSpeechRecognition();
    if (!SpeechRec) return; // Browser doesn't support it

    const recognition = new SpeechRec();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    let gotResult = false;

    recognition.onresult = (event: Event) => {
      gotResult = true;
      const e = event as Event & {
        results?: {
          [index: number]: { [index: number]: { transcript?: string } };
        };
      };
      const transcript: string = e.results?.[0]?.[0]?.transcript ?? "";
      if (transcript.trim()) {
        handleSubmit(transcript.trim());
      }
      setListening(false);
      recognitionRef.current = null;
    };

    recognition.onerror = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      // Only reset if we didn't already handle a result
      if (!gotResult) {
        setListening(false);
      }
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      setListening(true);
    } catch {
      // start() can throw if already started or not allowed
      setListening(false);
      recognitionRef.current = null;
    }
  }, [listening, handleSubmit]);

  const isBusy = phase === "executing" || phase === "preview";
  const hasDraft = !!draftChangeset && phase === "preview";
  return (
    <div className="intent-bar border-t pb-safe">
      {/* Busy indicator */}
      {phase === "executing" && (
        <div className="flex items-center gap-2 px-4 pt-2 text-xs text-muted-foreground">
          <LoaderIcon className="size-3 animate-spin" />
          <span>Executing...</span>
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
          <span>Something went wrong.</span>
          <button
            type="button"
            className="underline hover:no-underline"
            onClick={cancelDraft}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Selection-based suggestion chips (only when no draft) */}
      {!hasDraft && chips.length > 0 && !isBusy && phase !== "complete" && (
        <div className="flex gap-1.5 overflow-x-auto px-4 pt-2 pb-1 scrollbar-none">
          {chips.map((chip) => (
            <button
              key={chip}
              type="button"
              className="intent-suggestion shrink-0 min-h-[32px]"
              onClick={() => handleSubmit(chip)}
              disabled={isBusy}
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Input row */}
      <div className="flex items-center gap-2 px-3 py-2 md:px-4">
        {/* Mic button — always rendered; toggleVoice gracefully no-ops if unsupported */}
        <Button
          variant={listening ? "default" : "ghost"}
          size="icon"
          className={`min-h-[44px] min-w-[44px] shrink-0 ${listening ? "bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 text-white" : ""}`}
          aria-label={listening ? "Stop listening" : "Voice input"}
          onClick={toggleVoice}
          disabled={isBusy || phase === "complete"}
        >
          {listening ? (
            <MicOffIcon className="size-5" />
          ) : (
            <MicIcon className="size-5" />
          )}
        </Button>

        {/* Text input */}
        <input
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
          disabled={isBusy || phase === "complete"}
        />

        {/* Go button */}
        <Button
          variant="ghost"
          size="icon"
          className="min-h-[44px] min-w-[44px] shrink-0"
          aria-label="Submit"
          disabled={isBusy || phase === "complete" || !input.trim()}
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
