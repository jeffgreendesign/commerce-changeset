"use client";

import { useSyncExternalStore } from "react";
import { MicIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FEATURED_ACTIONS } from "@/lib/actions";

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
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 pt-8 text-center sm:pt-12 lg:gap-8 lg:pt-16">
      <div>
        <h2 className="text-xl font-semibold tracking-tight lg:text-2xl">
          What commerce changes would you like to make?
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick an action or type your own request
        </p>
      </div>

      <div className="grid w-full max-w-2xl grid-cols-2 gap-3 md:grid-cols-4 md:gap-4 lg:max-w-4xl lg:gap-5">
        {FEATURED_ACTIONS.map((intent) => {
          const Icon = intent.icon;
          return (
            <Card
              key={intent.id}
              role="button"
              tabIndex={0}
              className="cursor-pointer transition-all duration-200 hover:ring-2 hover:ring-ring/30 hover:shadow-lg hover:shadow-foreground/[0.04] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:translate-y-px active:scale-[0.98]"
              onClick={() => onSelect(intent.prompt)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(intent.prompt);
                }
              }}
            >
              <CardContent className="flex min-h-[80px] flex-col items-center justify-center gap-2 p-4 text-center md:min-h-[120px] md:gap-3 md:p-6">
                <div
                  className={cn(
                    "flex size-12 items-center justify-center rounded-xl md:size-14 md:rounded-2xl",
                    intent.iconBg,
                  )}
                >
                  <Icon className={cn("size-6 md:size-7", intent.iconColor)} />
                </div>
                <span className="text-sm font-medium md:text-base">{intent.title}</span>
                <span className="text-xs text-muted-foreground leading-tight md:text-sm">
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
