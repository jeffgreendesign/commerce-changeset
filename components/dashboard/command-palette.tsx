"use client";

import { useEffect, useState, useCallback } from "react";
import {
  DollarSignIcon,
  RocketIcon,
  TagIcon,
  SearchIcon,
  RotateCcwIcon,
  SunIcon,
  MoonIcon,
} from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
} from "@/components/ui/command";
import { useTheme } from "next-themes";

// ── Types ────────────────────────────────────────────────────────────

interface CommandPaletteProps {
  onSubmitPrompt: (prompt: string) => void;
}

// ── Command items ────────────────────────────────────────────────────

const ACTION_COMMANDS = [
  {
    icon: DollarSignIcon,
    label: "Price Change",
    description: "Update pricing for a product",
    prompt: "Set a 20% discount on STR-001 Classic Runner",
  },
  {
    icon: RocketIcon,
    label: "Launch Promo",
    description: "Activate a promo campaign",
    prompt: "Launch the spring promo for all Stride products",
  },
  {
    icon: TagIcon,
    label: "Toggle Promo Status",
    description: "Enable or disable promo",
    prompt: "Set promo status to active for STR-002 Court Essential",
  },
  {
    icon: SearchIcon,
    label: "Query Catalog",
    description: "Check current prices and status",
    prompt: "What are the current prices for all products?",
  },
  {
    icon: RotateCcwIcon,
    label: "Bulk Price Change",
    description: "Update prices across multiple products",
    prompt: "Apply a 15% discount to all running shoes",
  },
];

// ── Component ────────────────────────────────────────────────────────

export function CommandPalette({ onSubmitPrompt }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const { setTheme, resolvedTheme } = useTheme();

  const handleSelect = useCallback(
    (prompt: string) => {
      setOpen(false);
      onSubmitPrompt(prompt);
    },
    [onSubmitPrompt],
  );

  // Listen for Cmd+K / Ctrl+K
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search actions or type a request..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Actions">
          {ACTION_COMMANDS.map((cmd) => {
            const Icon = cmd.icon;
            return (
              <CommandItem
                key={cmd.label}
                onSelect={() => handleSelect(cmd.prompt)}
              >
                <Icon className="size-4 shrink-0" />
                <div className="flex flex-col">
                  <span>{cmd.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {cmd.description}
                  </span>
                </div>
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandGroup heading="Settings">
          <CommandItem
            onSelect={() => {
              setTheme(resolvedTheme === "dark" ? "light" : "dark");
              setOpen(false);
            }}
          >
            {resolvedTheme === "dark" ? (
              <SunIcon className="size-4" />
            ) : (
              <MoonIcon className="size-4" />
            )}
            <span>
              Switch to {resolvedTheme === "dark" ? "light" : "dark"} mode
            </span>
            <CommandShortcut>Theme</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
