"use client";

import {
  LayoutDashboardIcon,
  MessageSquareIcon,
  HistoryIcon,
  ZapIcon,
  MenuIcon,
  XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useState } from "react";

// ── Nav items ────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { icon: MessageSquareIcon, label: "Chat", id: "chat" as const },
  { icon: HistoryIcon, label: "History", id: "history" as const },
  { icon: ZapIcon, label: "Quick Actions", id: "actions" as const },
] as const;

// ── Types ────────────────────────────────────────────────────────────

interface RailProps {
  expanded: boolean;
  onToggle: () => void;
  userName: string;
}

// ── Rail Content (shared between desktop sidebar and mobile sheet) ───

function RailNav({
  expanded,
  activeItem,
  onSelect,
}: {
  expanded: boolean;
  activeItem: string;
  onSelect: (id: string) => void;
}) {
  return (
    <nav className="flex flex-col gap-1 px-2 py-2">
      <TooltipProvider>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeItem === item.id;
          return (
            <Tooltip key={item.id}>
              <TooltipTrigger
                render={
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    size={expanded ? "default" : "icon"}
                    className={cn(
                      "min-h-[44px] min-w-[44px]",
                      expanded && "justify-start gap-3 px-3",
                    )}
                    onClick={() => onSelect(item.id)}
                  />
                }
              >
                <Icon className="size-4 shrink-0" />
                {expanded && (
                  <span className="text-sm font-medium">{item.label}</span>
                )}
              </TooltipTrigger>
              {!expanded && (
                <TooltipContent side="right">{item.label}</TooltipContent>
              )}
            </Tooltip>
          );
        })}
      </TooltipProvider>
    </nav>
  );
}

// ── Main export ──────────────────────────────────────────────────────

export function Rail({ expanded, onToggle, userName }: RailProps) {
  const [activeItem, setActiveItem] = useState("chat");
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile hamburger — only visible below md */}
      <div className="fixed top-3 left-3 z-40 md:hidden">
        <Button
          variant="outline"
          size="icon"
          className="min-h-[44px] min-w-[44px] bg-background"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation"
        >
          <MenuIcon className="size-5" />
        </Button>
      </div>

      {/* Mobile sheet overlay */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="border-b px-4 py-3">
            <SheetTitle className="flex items-center gap-2 text-sm">
              <LayoutDashboardIcon className="size-4" />
              Commerce Changeset
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100%-57px)]">
            <RailNav
              expanded
              activeItem={activeItem}
              onSelect={(id) => {
                setActiveItem(id);
                setMobileOpen(false);
              }}
            />
            <div className="mt-auto border-t px-4 py-3">
              <p className="truncate text-xs text-muted-foreground">
                {userName}
              </p>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Desktop rail — hidden below md */}
      <aside
        className={cn(
          "hidden flex-col border-r bg-sidebar transition-[width] duration-200 ease-in-out md:flex",
          expanded ? "w-56" : "w-16",
        )}
      >
        {/* Rail header */}
        <div
          className={cn(
            "flex h-[53px] items-center border-b",
            expanded ? "justify-between px-4" : "justify-center px-2",
          )}
        >
          {expanded && (
            <span className="flex items-center gap-2 text-sm font-semibold text-sidebar-foreground">
              <LayoutDashboardIcon className="size-4" />
              Changeset
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="min-h-[44px] min-w-[44px]"
            onClick={onToggle}
            aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
          >
            {expanded ? (
              <XIcon className="size-4" />
            ) : (
              <MenuIcon className="size-4" />
            )}
          </Button>
        </div>

        {/* Rail nav */}
        <ScrollArea className="flex-1">
          <RailNav
            expanded={expanded}
            activeItem={activeItem}
            onSelect={setActiveItem}
          />
        </ScrollArea>

        {/* Rail footer */}
        {expanded && (
          <div className="border-t px-4 py-3">
            <p className="truncate text-xs text-muted-foreground">{userName}</p>
          </div>
        )}
      </aside>
    </>
  );
}
