import { auth0 } from "@/lib/auth0";
import { redirect } from "next/navigation";
import { Chat } from "./chat";

export default async function DashboardPage() {
  const session = await auth0.getSession();
  if (!session) {
    redirect("/auth/login");
  }

  const userName = session.user.name ?? session.user.email ?? "User";

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <h1 className="text-lg font-semibold tracking-tight">
          Commerce Changeset
        </h1>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">{userName}</span>
          <a
            href="/auth/logout"
            className="text-muted-foreground underline-offset-4 hover:underline"
          >
            Log out
          </a>
        </div>
      </header>
      <Chat />
    </div>
  );
}
