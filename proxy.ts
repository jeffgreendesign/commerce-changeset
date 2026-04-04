import { auth0 } from "./lib/auth0";
import { NextResponse } from "next/server";

export async function proxy(request: Request) {
  // Skip Auth0 middleware for /demo and /judges routes — both use cookie-based mock auth
  const url = new URL(request.url);
  if (
    url.pathname === "/demo" ||
    url.pathname.startsWith("/demo/") ||
    url.pathname === "/judges" ||
    url.pathname.startsWith("/judges/")
  ) {
    return NextResponse.next();
  }

  return await auth0.middleware(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
