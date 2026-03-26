"use client";

import {
  DollarSignIcon,
  RocketIcon,
  TagIcon,
  SearchIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ── Intent definitions ───────────────────────────────────────────────

export interface Intent {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  prompt: string;
  iconBg: string;
  iconColor: string;
}

const INTENTS: Intent[] = [
  {
    id: "price-change",
    icon: DollarSignIcon,
    title: "Price Change",
    description: "Update pricing for any product",
    prompt: "Set a 20% discount on STR-001 Classic Runner",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
    iconColor: "text-emerald-700 dark:text-emerald-400",
  },
  {
    id: "launch-promo",
    icon: RocketIcon,
    title: "Launch Promo",
    description: "Activate a promo campaign",
    prompt: "Launch the spring promo for all Stride products",
    iconBg: "bg-blue-100 dark:bg-blue-900/30",
    iconColor: "text-blue-700 dark:text-blue-400",
  },
  {
    id: "toggle-promo",
    icon: TagIcon,
    title: "Toggle Promo",
    description: "Activate or deactivate promo status",
    prompt: "Set promo status to active for STR-002 Court Essential",
    iconBg: "bg-amber-100 dark:bg-amber-900/30",
    iconColor: "text-amber-700 dark:text-amber-400",
  },
  {
    id: "query-data",
    icon: SearchIcon,
    title: "Query Data",
    description: "Check current catalog state",
    prompt: "What are the current prices for all products?",
    iconBg: "bg-violet-100 dark:bg-violet-900/30",
    iconColor: "text-violet-700 dark:text-violet-400",
  },
];

// ── Component ────────────────────────────────────────────────────────

interface IntentCardsProps {
  onSelect: (prompt: string) => void;
}

export function IntentCards({ onSelect }: IntentCardsProps) {
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
        {INTENTS.map((intent) => {
          const Icon = intent.icon;
          return (
            <Card
              key={intent.id}
              className="cursor-pointer transition-all hover:ring-2 hover:ring-ring/30 active:translate-y-px"
              onClick={() => onSelect(intent.prompt)}
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
          {typeof navigator !== "undefined" &&
          /Mac/.test(navigator.userAgent)
            ? "\u2318K"
            : "Ctrl+K"}
        </kbd>{" "}
        for command palette
      </p>
    </div>
  );
}
