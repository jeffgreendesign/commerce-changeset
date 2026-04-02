import { auth0 } from "./lib/auth0";

export async function proxy(request: Request) {
  // Skip Auth0 middleware for /demo routes — demo mode uses cookie-based mock auth
  const url = new URL(request.url);
  if (url.pathname.startsWith("/demo")) {
    return new Response(null, { status: 200 });
  }

  return await auth0.middleware(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
