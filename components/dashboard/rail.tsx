"use client";

import Link from "next/link";
import {
  LayoutDashboardIcon,
  MessageSquareIcon,
  HistoryIcon,
  ZapIcon,
  MenuIcon,
  XIcon,
  PlusIcon,
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
import { ChatHistoryPanel } from "./chat-history-panel";
import { useLayout } from "./layout-shell";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { toast } from "sonner";

// ── Nav items ────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { icon: MessageSquareIcon, label: "Chat", id: "chat" as const, enabled: true },
  { icon: HistoryIcon, label: "History", id: "history" as const, enabled: true },
  { icon: ZapIcon, label: "Quick Actions", id: "actions" as const, enabled: true },
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
    <nav className="flex flex-col gap-1.5 px-2.5 py-3">
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
                      !item.enabled && "opacity-50",
                    )}
                    onClick={() => {
                      if (item.enabled) {
                        onSelect(item.id);
                      } else {
                        toast.info(`${item.label} — coming soon`);
                      }
                    }}
                  />
                }
              >
                <Icon className="size-4 shrink-0" />
                {expanded && (
                  <span className="text-sm font-medium">
                    {item.label}
                    {!item.enabled && (
                      <span className="ml-1.5 text-[10px] text-muted-foreground font-normal">
                        Soon
                      </span>
                    )}
                  </span>
                )}
              </TooltipTrigger>
              {!expanded && (
                <TooltipContent side="right">
                  {item.label}
                  {!item.enabled && " (coming soon)"}
                </TooltipContent>
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
  const { activeChatId, startNewChat, loadChat, activeView, setActiveView } = useLayout();
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeItem =
    activeView === "history"
      ? "history"
      : activeView === "actions"
        ? "actions"
        : "chat";

  const handleSelect = (id: string) => {
    if (id === "chat") {
      setActiveView("chat");
    } else if (id === "history") {
      setActiveView("history");
    } else if (id === "actions") {
      setActiveView("actions");
    }
  };

  const handleNewChat = () => {
    startNewChat();
    setMobileOpen(false);
  };

  const handleSelectChat = (id: string) => {
    loadChat(id);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile hamburger — only visible below md, safe area aware */}
      <div className="fixed top-[max(0.75rem,env(safe-area-inset-top,0.75rem))] left-[max(0.75rem,env(safe-area-inset-left,0.75rem))] z-40 md:hidden">
        <Button
          variant="outline"
          size="icon"
          className="glass min-h-[44px] min-w-[44px] shadow-xs"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation"
        >
          <MenuIcon className="size-5" />
        </Button>
      </div>

      {/* Mobile sheet overlay */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="flex w-72 flex-col p-0">
          <SheetHeader className="border-b px-4 py-3">
            <SheetTitle className="flex items-center gap-2 text-sm">
              <LayoutDashboardIcon className="size-4" />
              <Link href="/" className="hover:text-foreground">Commerce Changeset</Link>
            </SheetTitle>
          </SheetHeader>

          {/* New Chat button */}
          <div className="border-b px-3 py-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full min-h-[44px] gap-2"
              onClick={handleNewChat}
            >
              <PlusIcon className="size-4" />
              New Chat
            </Button>
          </div>

          <RailNav
            expanded
            activeItem={activeItem}
            onSelect={(id) => {
              handleSelect(id);
              setMobileOpen(false);
            }}
          />

          {/* Show history panel inline in mobile sheet when history is selected */}
          {activeItem === "history" && (
            <ChatHistoryPanel
              activeChatId={activeChatId}
              onSelectChat={handleSelectChat}
              onNewChat={handleNewChat}
            />
          )}

          <div className="mt-auto border-t px-4 py-3">
            <p className="truncate text-xs text-muted-foreground">
              {userName}
            </p>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop rail — hidden below md */}
      <aside
        className={cn(
          "hidden flex-col border-r bg-sidebar transition-[width] duration-200 ease-in-out md:flex",
          expanded ? "w-60" : "w-16",
        )}
      >
        {/* Rail header */}
        <div
          className={cn(
            "flex min-h-[53px] items-center border-b",
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

        {/* New Chat button */}
        <div className={cn("border-b", expanded ? "px-3 py-2" : "px-2 py-2")}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="outline"
                    size={expanded ? "sm" : "icon"}
                    className={cn(
                      "min-h-[44px] min-w-[44px]",
                      expanded && "w-full gap-2",
                    )}
                    onClick={handleNewChat}
                  />
                }
              >
                <PlusIcon className="size-4" />
                {expanded && <span>New Chat</span>}
              </TooltipTrigger>
              {!expanded && (
                <TooltipContent side="right">New Chat</TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Rail nav */}
        <ScrollArea className="flex-1">
          <RailNav
            expanded={expanded}
            activeItem={activeItem}
            onSelect={handleSelect}
          />

          {/* Inline history panel when expanded and history is active */}
          {expanded && activeItem === "history" && (
            <div className="border-t">
              <ChatHistoryPanel
                activeChatId={activeChatId}
                onSelectChat={(id) => loadChat(id)}
                onNewChat={startNewChat}
              />
            </div>
          )}
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
