import { auth0 } from "@/lib/auth0";
import { redirect } from "next/navigation";
import { Chat } from "./chat";
import { LayoutShell } from "@/components/dashboard/layout-shell";
import { StatusBarProvider, StatusBar } from "@/components/dashboard/status-bar";
import { ThemeToggle } from "@/components/dashboard/theme-toggle";

export default async function DashboardPage() {
  const session = await auth0.getSession();
  if (!session) {
    redirect("/auth/login");
  }

  const userName = session.user.name ?? session.user.email ?? "User";

  return (
    <StatusBarProvider>
      <div className="flex h-dvh flex-col overflow-hidden">
        {/* Global header — frosted glass for Liquid Glass harmony */}
        <header className="glass sticky top-0 z-30 flex items-center justify-between border-b px-4 py-3 pt-safe px-safe sm:px-6">
          {/* Spacer on mobile for hamburger offset */}
          <div className="w-12 md:hidden" />
          <h1 className="text-sm font-semibold tracking-tight sm:text-lg">
            <span className="md:hidden">Changeset</span>
            <span className="hidden md:inline">Commerce Changeset</span>
          </h1>
          <div className="flex items-center gap-1 text-sm sm:gap-2">
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
        </header>

        {/* Status bar */}
        <StatusBar />

        {/* Three-panel layout */}
        <LayoutShell userName={userName}>
          <Chat />
        </LayoutShell>
      </div>
    </StatusBarProvider>
  );
}
