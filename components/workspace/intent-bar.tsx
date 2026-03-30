"use client";

import { useState, useCallback, useMemo } from "react";
import { ArrowRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "./workspace-provider";

const SINGLE_CHIPS = ["Change price", "Toggle promo", "View history"];
const MULTI_CHIPS = ["Bulk price change", "Compare", "Toggle promo"];

export function IntentBar() {
  const { products, selectedIds, phase, submitIntent } = useWorkspace();
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
      if (!trimmed || phase === "executing") return;
      setInput("");
      submitIntent(trimmed);
    },
    [phase, submitIntent],
  );

  const isDisabled = phase === "executing";

  return (
    <div className="intent-bar border-t pb-safe">
      {/* Suggestion chips */}
      {chips.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto px-4 pt-2 pb-1 scrollbar-none">
          {chips.map((chip) => (
            <button
              key={chip}
              type="button"
              className="intent-suggestion shrink-0 min-h-[32px]"
              onClick={() => handleSubmit(chip)}
              disabled={isDisabled}
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
          placeholder={placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSubmit(input);
            }
          }}
          disabled={isDisabled}
        />

        {/* Go button */}
        <Button
          variant="ghost"
          size="icon"
          className="min-h-[44px] min-w-[44px] shrink-0"
          aria-label="Submit"
          disabled={isDisabled || !input.trim()}
          onClick={() => handleSubmit(input)}
        >
          <ArrowRightIcon className="size-5" />
        </Button>
      </div>
    </div>
  );
}
