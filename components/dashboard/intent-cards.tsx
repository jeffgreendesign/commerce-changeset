"use client";

import { useSyncExternalStore } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ACTIONS } from "@/lib/actions";

// Detect Mac platform without hydration mismatch
const subscribe = () => () => {};
const getSnapshot = () =>
  typeof navigator !== "undefined" && /Mac/.test(navigator.userAgent)
    ? "\u2318K"
    : "Ctrl+K";
const getServerSnapshot = () => "Ctrl+K";

// ── Component ────────────────────────────────────────────────────────

interface IntentCardsProps {
  onSelect: (prompt: string) => void;
}

export function IntentCards({ onSelect }: IntentCardsProps) {
  const modKey = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 pt-12 text-center sm:pt-20">
      <div>
        <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
          What commerce changes would you like to make?
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick an action or type your own request
        </p>
      </div>

      <div className="grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
        {ACTIONS.map((intent) => {
          const Icon = intent.icon;
          return (
            <Card
              key={intent.id}
              role="button"
              tabIndex={0}
              className="cursor-pointer transition-all hover:ring-2 hover:ring-ring/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:translate-y-px"
              onClick={() => onSelect(intent.prompt)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(intent.prompt);
                }
              }}
            >
              <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
                <div
                  className={cn(
                    "flex size-10 items-center justify-center rounded-lg",
                    intent.iconBg,
                  )}
                >
                  <Icon className={cn("size-5", intent.iconColor)} />
                </div>
                <span className="text-sm font-medium">{intent.title}</span>
                <span className="text-[11px] text-muted-foreground leading-tight">
                  {intent.description}
                </span>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Press{" "}
        <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono">
          {modKey}
        </kbd>{" "}
        for command palette
      </p>
    </div>
  );
}
