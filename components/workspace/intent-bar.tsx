"use client";

import { useState, useCallback, useMemo } from "react";
import { ArrowRightIcon, LoaderIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "./workspace-provider";

const SINGLE_CHIPS = ["Change price", "Toggle promo", "View history"];
const MULTI_CHIPS = ["Bulk price change", "Compare", "Toggle promo"];

export function IntentBar() {
  const { products, selectedIds, phase, submitIntent, cancelDraft } = useWorkspace();
  const [input, setInput] = useState("");

  const selectedProducts = useMemo(
    () => products.filter((p) => selectedIds.has(p.id)),
    [products, selectedIds],
  );

  const placeholder = useMemo(() => {
    if (selectedProducts.length === 0)
      return "Describe a change, or select products...";
    if (selectedProducts.length === 1)
      return `${selectedProducts[0].name} selected`;
    return `${selectedProducts.length} products selected`;
  }, [selectedProducts]);

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

  return (
    <div className="intent-bar border-t pb-safe">
      {/* Busy indicator */}
      {isBusy && (
        <div className="flex items-center gap-2 px-4 pt-2 text-xs text-muted-foreground">
          <LoaderIcon className="size-3 animate-spin" />
          <span>{phase === "preview" ? "Building changeset..." : "Executing..."}</span>
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

      {/* Suggestion chips */}
      {chips.length > 0 && !isBusy && (
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
        {/* Text input */}
        <input
          type="text"
          className="flex-1 bg-transparent text-base placeholder:text-muted-foreground focus:outline-none md:text-sm"
          placeholder={isBusy ? "Working..." : placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSubmit(input);
            }
          }}
          disabled={isBusy}
        />

        {/* Go button */}
        <Button
          variant="ghost"
          size="icon"
          className="min-h-[44px] min-w-[44px] shrink-0"
          aria-label="Submit"
          disabled={isBusy || !input.trim()}
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
