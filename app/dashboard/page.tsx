import { auth0 } from "@/lib/auth0";
import { redirect } from "next/navigation";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const session = await auth0.getSession();
  if (!session) {
    redirect("/auth/login");
  }

  const userName = session.user.name ?? session.user.email ?? "User";

  return <DashboardClient userName={userName} />;
}
