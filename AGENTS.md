<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project Overview

Commerce Changeset is built with Next.js 16 (App Router), React 19, TypeScript (strict mode), Tailwind CSS v4, Base UI + shadcn/ui (CVA variants), Auth0 v4 (`@auth0/nextjs-auth0`), Vercel AI SDK (`ai`, `@auth0/ai-vercel`), zod for schema validation, and json-rules-engine for business rules.

## File Structure

```
app/
  layout.tsx          — Root layout (Geist fonts, metadata, global styles)
  page.tsx            — Home page (server component, Auth0 session check)
  globals.css         — Tailwind v4 theme config (@theme inline, oklch colors)
  api/auth/[auth0]/
    route.ts          — Auth0 route handler (login, logout, callback)
components/ui/
  button.tsx          — shadcn Button wrapping Base UI ButtonPrimitive + CVA
lib/
  auth0.ts            — Auth0Client singleton (server-only)
  utils.ts            — cn() utility (clsx + tailwind-merge)
middleware.ts         — Auth0 middleware intercepting all non-static routes
public/               — Static assets (SVGs)
```

## Coding Conventions

- **Server components by default.** Only add `"use client"` when the component needs browser APIs, event handlers, or hooks.
- **TypeScript strict mode.** No `any` types. Use zod for runtime validation at system boundaries.
- **Import alias:** `@/*` maps to the project root. Use `@/lib/auth0`, `@/components/ui/button`, etc.
- **Styling:** Use Tailwind utility classes with theme tokens (e.g., `bg-primary`, `text-muted-foreground`). Avoid arbitrary values when a token exists.
- **Components:** shadcn components live in `components/ui/`. They wrap Base UI primitives and use CVA for variant definitions. Use `cn()` from `@/lib/utils` for conditional class merging.
- **Adding components:** Run `npx shadcn@latest add <component>` to scaffold new UI components into `components/ui/`.

## Agent Behavior

- **Read Next.js docs first.** Before modifying Next.js patterns (routing, middleware, data fetching), read the relevant guide in `node_modules/next/dist/docs/`.
- **Lint before committing.** Run `npm run lint` and fix all issues before any commit.
- **No hardcoded secrets.** Auth0 credentials, API keys, and sensitive values must come from environment variables defined in `.env.local`. Never log or expose them.
- **Error handling:** Prefer early returns over nested try/catch. Only catch errors at system boundaries (API routes, external service calls).
- **PR expectations:** PR descriptions must explain what changed and why. Keep PRs focused on one logical change.
- **Logging:** Use `console.error` for errors that need attention. Avoid verbose console.log in production code paths.

## Auth0 Integration

Auth0 v4 uses a middleware-based pattern (not the legacy `handleAuth()` route handler).

- **Client:** `lib/auth0.ts` exports a singleton `Auth0Client` from `@auth0/nextjs-auth0/server`. This is server-only — never import it in client components.
- **Middleware:** `middleware.ts` calls `auth0.middleware(request)` to handle `/auth/login`, `/auth/logout`, `/auth/callback`, and session cookie management. It intercepts all routes except static assets.
- **Route handler:** `app/api/auth/[auth0]/route.ts` delegates to `auth0.middleware()` for the `/api/auth/*` path.
- **Session access:** In server components and route handlers, call `await auth0.getSession()` to get the current user session. Returns `null` if unauthenticated.
- **Environment variables:** `AUTH0_SECRET`, `AUTH0_BASE_URL`, `AUTH0_ISSUER_BASE_URL`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_AUDIENCE` must all be set in `.env.local`.

## Tailwind v4 & Base UI

- **No tailwind.config.js.** All theme configuration is CSS-based in `app/globals.css` using `@theme inline { ... }`.
- **Colors:** oklch color space. Theme tokens defined as CSS custom properties in `:root` and `.dark`.
- **Dark mode:** `@custom-variant dark (&:is(.dark *))` — toggle by adding/removing the `dark` class on an ancestor.
- **Imports:** `globals.css` imports `tailwindcss`, `tw-animate-css`, and `shadcn/tailwind.css` in that order.
- **Base UI:** shadcn components use Base UI React primitives (e.g., `@base-ui/react/button`). These are unstyled headless components — all styling comes from Tailwind classes applied via CVA.

## Testing

- **Lint:** `npm run lint` (ESLint 9 + eslint-config-next)
- **Build:** `npm run build` — must compile without TypeScript or build errors
- **Dev:** `npm run dev` — manual testing at http://localhost:3000
- **Auth0 flows:** Login/logout require valid Auth0 credentials in `.env.local`. With placeholder values, expect Auth0 client warnings at build time (this is normal).
- **Unit tests:** Not yet configured. When added, prefer Vitest for speed and ESM compatibility.
- **E2E tests:** Not yet configured. When added, prefer Playwright for App Router compatibility.

## Examples

### Adding a new authenticated server page

```typescript
// app/dashboard/page.tsx
import { auth0 } from "@/lib/auth0";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth0.getSession();
  if (!session) {
    redirect("/auth/login");
  }

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome, {session.user.name}</p>
    </div>
  );
}
```

### Adding a new shadcn component

```bash
npx shadcn@latest add card
```

Then use it:

```typescript
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export function MyCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Title</CardTitle>
      </CardHeader>
      <CardContent>Content here</CardContent>
    </Card>
  );
}
```
