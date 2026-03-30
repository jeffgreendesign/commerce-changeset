"use client";

import Link from "next/link";
import { BookOpenIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chat } from "./chat";
import { LayoutShell, useLayout } from "@/components/dashboard/layout-shell";
import { StatusBarProvider, StatusBarContent } from "@/components/dashboard/status-bar";
import { ThemeToggle } from "@/components/dashboard/theme-toggle";
import { ChatHistoryPanel } from "@/components/dashboard/chat-history-panel";
import { QuickActionsPanel } from "@/components/dashboard/quick-actions-panel";

// ── Inner content that has access to layout context ──────────────────

function DashboardContent({ userName }: { userName: string }) {
  const { activeChatId, startNewChat, loadChat, activeView } = useLayout();

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      {/* Global header — elevated glass with integrated status bar */}
      <header className="glass-elevated sticky top-0 z-30 flex flex-col border-b pt-safe">
        {/* Row 1: Nav */}
        <div className="flex items-center justify-between px-4 py-2.5 md:px-6 lg:px-8">
          {/* Spacer on mobile for hamburger offset */}
          <div className="w-12 md:hidden" />
          <h1 className="text-xs font-semibold tracking-tighter whitespace-nowrap sm:text-lg sm:tracking-tight">
            <Link href="/" className="hover:text-foreground">
              Commerce Changeset
            </Link>
          </h1>
          <div className="flex items-center gap-1 text-sm sm:gap-2">
            {/* New Chat button — mobile accessible */}
            <Button
              variant="ghost"
              size="icon"
              className="min-h-[44px] min-w-[44px] md:hidden"
              onClick={startNewChat}
              aria-label="New chat"
            >
              <PlusIcon className="size-5" />
            </Button>
            <Link
              href="/blog"
              className="hidden items-center gap-1 text-muted-foreground underline-offset-4 hover:underline sm:inline-flex"
            >
              <BookOpenIcon className="size-3.5" />
              <span className="text-sm">Blog</span>
            </Link>
            <span className="hidden text-muted-foreground sm:inline">
              {userName}
            </span>
            <ThemeToggle />
            <a
              href="/auth/logout"
              className="inline-flex min-h-[44px] items-center px-2 text-muted-foreground underline-offset-4 hover:underline"
            >
              Log out
            </a>
          </div>
        </div>
        {/* Row 2: Status bar (integrated) */}
        <div className="flex items-center gap-2 border-t border-foreground/5 pl-[calc(env(safe-area-inset-left,0px)+3.5rem)] pr-[calc(env(safe-area-inset-right,0px)+1rem)] py-1.5 text-[11px] text-muted-foreground md:pl-6 md:pr-6 lg:pl-8 lg:pr-8">
          <StatusBarContent />
        </div>
      </header>

      {/* Content area — switches between chat, actions, and history */}
      {activeView === "chat" ? (
        <Chat key={activeChatId} chatId={activeChatId} />
      ) : activeView === "actions" ? (
        <QuickActionsPanel />
      ) : (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="border-b px-4 py-3 sm:px-6">
            <h2 className="text-sm font-semibold">Chat History</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Return to any previous conversation
            </p>
          </div>
          <ChatHistoryPanel
            activeChatId={activeChatId}
            onSelectChat={loadChat}
            onNewChat={startNewChat}
          />
        </div>
      )}
    </div>
  );
}

// ── Main export ──────────────────────────────────────────────────────

export function DashboardClient({ userName }: { userName: string }) {
  return (
    <StatusBarProvider>
      <LayoutShell userName={userName}>
        <DashboardContent userName={userName} />
      </LayoutShell>
    </StatusBarProvider>
  );
}
