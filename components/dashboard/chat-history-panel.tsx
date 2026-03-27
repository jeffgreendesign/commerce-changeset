"use client";

import { useState, useCallback } from "react";
import { MessageSquareIcon, Trash2Icon, InboxIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  loadAllSessions,
  deleteChatSession,
  type ChatSession,
} from "@/lib/chat-history";
import { cn } from "@/lib/utils";

// ── Relative time formatting ─────────────────────────────────────────

function relativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// ── Component ────────────────────────────────────────────────────────

interface ChatHistoryPanelProps {
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
}

export function ChatHistoryPanel({
  activeChatId,
  onSelectChat,
  onNewChat,
}: ChatHistoryPanelProps) {
  const [sessions, setSessions] = useState<ChatSession[]>(() => loadAllSessions());
  const [refreshKey, setRefreshKey] = useState(activeChatId);

  // Re-load sessions when activeChatId changes (indicates new saves or switches)
  if (refreshKey !== activeChatId) {
    setRefreshKey(activeChatId);
    setSessions(loadAllSessions());
  }

  const handleDelete = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      deleteChatSession(id);
      // Reload from storage to stay in sync
      setSessions(loadAllSessions());
      if (id === activeChatId) {
        onNewChat();
      }
    },
    [activeChatId, onNewChat],
  );

  if (sessions.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
          <InboxIcon className="size-6 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium">No conversations yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Your chat history will appear here
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="mt-2 min-h-[44px]"
          onClick={onNewChat}
        >
          Start a conversation
        </Button>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="space-y-1 p-2">
        {sessions.map((session) => {
          const isActive = session.id === activeChatId;
          return (
            <div
              key={session.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelectChat(session.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectChat(session.id);
                }
              }}
              className={cn(
                "group flex w-full cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors min-h-[44px]",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-muted/60 active:bg-muted",
              )}
            >
              <MessageSquareIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-sm font-medium leading-tight">
                    {session.title}
                  </p>
                  <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                    {relativeTime(session.updatedAt)}
                  </span>
                </div>
                {session.preview && (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground leading-tight">
                    {session.preview}
                  </p>
                )}
                <div className="mt-1 flex items-center gap-2">
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground">
                    {session.messageCount} msg{session.messageCount !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="mt-0.5 size-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                onClick={(e) => handleDelete(e, session.id)}
                aria-label={`Delete "${session.title}"`}
              >
                <Trash2Icon className="size-3.5 text-muted-foreground" />
              </Button>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
