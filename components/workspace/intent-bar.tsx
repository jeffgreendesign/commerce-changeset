"use client";

import { useState, useCallback, useMemo } from "react";
import {
  ArrowRightIcon,
  LoaderIcon,
  CheckCircleIcon,
  MicIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "./workspace-provider";
import { useLayout } from "@/components/dashboard/layout-shell";

const SINGLE_CHIPS = ["Change price", "Toggle promo", "View history"];
const MULTI_CHIPS = ["Bulk price change", "Compare", "Toggle promo"];

export function IntentBar() {
  const {
    products,
    selectedIds,
    phase,
    submitIntent,
    cancelDraft,
    draftChangeset,
    executionError,
  } = useWorkspace();
  const { setActiveView } = useLayout();
  const [input, setInput] = useState("");

  const selectedProducts = useMemo(
    () => products.filter((p) => selectedIds.has(p.id)),
    [products, selectedIds],
  );

  const placeholder = useMemo(() => {
    if (draftChangeset && (phase === "preview" || phase === "executing")) {
      return "Review changeset above";
    }
    if (phase === "complete") return "Changes applied";
    if (selectedProducts.length === 0)
      return "What would you like to change?";
    if (selectedProducts.length === 1)
      return `${selectedProducts[0].name} — what to change?`;
    return `${selectedProducts.length} products — what to change?`;
  }, [selectedProducts, draftChangeset, phase]);

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
        {/* Voice button — switches to chat view where Gemini Live voice works */}
        <Button
          variant="ghost"
          size="icon"
          className="min-h-[44px] min-w-[44px] shrink-0 text-muted-foreground"
          aria-label="Switch to voice mode"
          onClick={() => setActiveView("chat")}
          disabled={isBusy || phase === "complete"}
        >
          <MicIcon className="size-5" />
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
