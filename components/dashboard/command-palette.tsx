"use client";

import { useEffect, useState, useCallback } from "react";
import { SunIcon, MoonIcon } from "lucide-react";
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
import { ACTIONS } from "@/lib/actions";

// ── Types ────────────────────────────────────────────────────────────

interface CommandPaletteProps {
  onSubmitPrompt: (prompt: string) => void;
}

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
          {ACTIONS.map((cmd) => {
            const Icon = cmd.icon;
            return (
              <CommandItem
                key={cmd.title}
                onSelect={() => handleSelect(cmd.prompt)}
              >
                <Icon className="size-4 shrink-0" />
                <div className="flex flex-col">
                  <span>{cmd.title}</span>
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
