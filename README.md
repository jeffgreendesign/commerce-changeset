# Commerce Changeset

A Next.js 16 application for managing commerce change workflows with Auth0 authentication, Vercel AI SDK integration, and json-rules-engine for business rules.

## Tech Stack

- **Framework:** Next.js 16.2.1 (App Router), React 19, TypeScript (strict mode)
- **Styling:** Tailwind CSS v4 (CSS-based config, oklch colors), shadcn/ui + Base UI + CVA
- **Auth:** Auth0 v4 (`@auth0/nextjs-auth0`) — middleware-based proxy pattern
- **AI:** Vercel AI SDK (`ai`), `@auth0/ai-vercel`
- **Rules:** json-rules-engine
- **Validation:** Zod

## Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill in your credentials:

   ```bash
   cp .env.example .env.local
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Description |
|----------|-------------|
| `AUTH0_SECRET` | Random 64-char hex string for session encryption |
| `AUTH0_DOMAIN` | Auth0 tenant domain (`your-tenant.auth0.com`) |
| `AUTH0_BASE_URL` | App base URL (`http://localhost:3000` for dev) |
| `AUTH0_ISSUER_BASE_URL` | Auth0 tenant URL (`https://your-tenant.auth0.com`) |
| `AUTH0_CLIENT_ID` | Auth0 application client ID |
| `AUTH0_CLIENT_SECRET` | Auth0 application client secret |
| `AUTH0_AUDIENCE` | Auth0 API audience identifier |
| `APP_BASE_URL` | App base URL for Connected Accounts flow |
| `GOOGLE_SHEET_ID` | Google Sheet ID for token-vault integration |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude model access |
| `ENABLE_SPIKE` | Set to `true` to enable spike routes in production |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run gates` | Run all quality gates (lint + typecheck + build) |
| `npm run verify` | Alias for `gates` |

## Project Structure

```
app/
  layout.tsx              — Root layout (Geist fonts, metadata)
  page.tsx                — Home page (login/logout UI)
  globals.css             — Tailwind v4 theme config
  api/auth/[auth0]/
    route.ts              — Auth0 route handler
  api/spike/token-vault/
    route.ts              — Token Vault → Google Sheets spike
  api/spike/connect-google/
    route.ts              — Google Connected Accounts linking spike
components/ui/
  button.tsx              — shadcn Button (Base UI + CVA)
config/
  version-floors.json     — Minimum dependency versions for CVE protection
lib/
  auth0.ts                — Auth0Client singleton (server-only)
  utils.ts                — cn() utility (clsx + tailwind-merge)
proxy.ts                  — Auth0 proxy intercepting all non-static routes
scripts/
  security-check.sh       — Pre-commit security scanning
  version-floor-check.sh  — Dependency version enforcement
```

## Peer Dependencies

This project uses Next.js 16.2.1 and React 19.2.4 alongside `@auth0/nextjs-auth0@^4.16.0`. If you encounter peer dependency conflicts during `npm install`, use:

```bash
npm install --legacy-peer-deps
```

## License

MIT
