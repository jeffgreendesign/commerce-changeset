"use client";

import { useSyncExternalStore } from "react";
import { MicIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  onVoiceActivate?: () => void;
  voiceAvailable?: boolean;
}

export function IntentCards({ onSelect, onVoiceActivate, voiceAvailable }: IntentCardsProps) {
  const modKey = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 pt-8 text-center sm:pt-20">
      <div>
        <h2 className="text-xl font-semibold tracking-tight sm:text-xl">
          What commerce changes would you like to make?
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick an action or type your own request
        </p>
      </div>

      <div className="grid w-full max-w-2xl grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-4">
        {ACTIONS.map((intent) => {
          const Icon = intent.icon;
          return (
            <Card
              key={intent.id}
              role="button"
              tabIndex={0}
              className="cursor-pointer transition-all hover:ring-2 hover:ring-ring/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:translate-y-px active:scale-[0.98]"
              onClick={() => onSelect(intent.prompt)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(intent.prompt);
                }
              }}
            >
              <CardContent className="flex min-h-[80px] flex-col items-center justify-center gap-2 p-4 text-center sm:min-h-0">
                <div
                  className={cn(
                    "flex size-12 items-center justify-center rounded-xl sm:size-10 sm:rounded-lg",
                    intent.iconBg,
                  )}
                >
                  <Icon className={cn("size-6 sm:size-5", intent.iconColor)} />
                </div>
                <span className="text-base font-medium sm:text-sm">{intent.title}</span>
                <span className="text-xs text-muted-foreground leading-tight sm:text-[11px]">
                  {intent.description}
                </span>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Voice FAB — prominent on mobile */}
      {voiceAvailable && onVoiceActivate && (
        <div className="flex flex-col items-center gap-2 sm:hidden">
          <Button
            size="lg"
            variant="outline"
            className="glass h-16 w-16 rounded-full shadow-lg active:scale-95"
            onClick={onVoiceActivate}
            aria-label="Start voice input"
          >
            <MicIcon className="size-7" />
          </Button>
          <span className="text-xs text-muted-foreground">Tap to speak</span>
        </div>
      )}

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
