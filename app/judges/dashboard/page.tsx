import { redirect } from "next/navigation";
import { isJudgeSession } from "@/lib/judges/config.server";
import { DashboardClient } from "@/app/dashboard/dashboard-client";

/**
 * Judge dashboard — production UI with simulated data.
 *
 * Uses the same DashboardClient as production but with isDemo=false
 * so no demo annotations or educational overlays appear. The judge_session
 * cookie triggers isDemoSession() in API routes, which return mock data.
 */
export default async function JudgesDashboardPage() {
  const hasJudge = await isJudgeSession();

  if (!hasJudge) {
    redirect("/judges");
  }

  return <DashboardClient userName="Judge" />;
}
