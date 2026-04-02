import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEMO_COOKIE_NAME } from "@/lib/demo/config";
import { DashboardClient } from "@/app/dashboard/dashboard-client";

/**
 * Demo dashboard — same UI as production but reads from demo cookie
 * instead of Auth0 session. All API calls check for the demo cookie
 * and return mock data.
 */
export default async function DemoDashboardPage() {
  const cookieStore = await cookies();
  const hasDemo = cookieStore.has(DEMO_COOKIE_NAME);

  if (!hasDemo) {
    redirect("/demo");
  }

  return <DashboardClient userName="Demo User" />;
}
