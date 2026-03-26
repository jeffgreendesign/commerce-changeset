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
      <div className="flex flex-1 flex-col">
        {/* Global header */}
        <header className="flex items-center justify-between border-b px-6 py-3">
          <h1 className="hidden text-lg font-semibold tracking-tight md:block">
            Commerce Changeset
          </h1>
          {/* Spacer on mobile for hamburger offset */}
          <div className="w-12 md:hidden" />
          <div className="flex items-center gap-2 text-sm">
            <span className="hidden text-muted-foreground sm:inline">
              {userName}
            </span>
            <ThemeToggle />
            <a
              href="/auth/logout"
              className="text-muted-foreground underline-offset-4 hover:underline"
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
