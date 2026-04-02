import { auth0 } from "./lib/auth0";
import { NextResponse } from "next/server";

export async function proxy(request: Request) {
  // Skip Auth0 middleware for /demo routes — demo mode uses cookie-based mock auth
  const url = new URL(request.url);
  if (url.pathname.startsWith("/demo")) {
    return NextResponse.next();
  }

  return await auth0.middleware(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
