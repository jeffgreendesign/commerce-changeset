import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEMO_COOKIE_NAME } from "@/lib/demo/config";
import { DashboardClient } from "@/app/dashboard/dashboard-client";
import { ACTIVE_VIEWS, type ActiveView } from "@/lib/navigation-types";

interface DemoDashboardPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function parseInitialView(value: string | string[] | undefined): ActiveView | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return ACTIVE_VIEWS.includes(raw as ActiveView) ? (raw as ActiveView) : undefined;
}

/**
 * Demo dashboard — same UI as production but reads from demo cookie
 * instead of Auth0 session. All API calls check for the demo cookie
 * and return mock data.
 */
export default async function DemoDashboardPage({ searchParams }: DemoDashboardPageProps) {
  const cookieStore = await cookies();
  const hasDemo = cookieStore.has(DEMO_COOKIE_NAME);
  const params = searchParams ? await searchParams : undefined;

  if (!hasDemo) {
    const view = Array.isArray(params?.view) ? params?.view[0] : params?.view;
    redirect(view ? `/demo?next=${encodeURIComponent(`/demo/dashboard?view=${view}`)}` : "/demo");
  }

  return <DashboardClient userName="Demo User" isDemo initialView={parseInitialView(params?.view)} />;
}
