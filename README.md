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
| `AUTH0_CIBA_AUDIENCE` | (Optional) API audience for CIBA + RAR requests |
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
  layout.tsx              — Root layout (Geist fonts, metadata, global styles)
  page.tsx                — Home page (server component, Auth0 session check)
  globals.css             — Tailwind v4 theme config (@theme inline, oklch colors)
  api/auth/[auth0]/
    route.ts              — Auth0 route handler (login, logout, callback)
  api/spike/token-vault/
    route.ts              — Token Vault → Google Sheets spike (GET, env-gated)
  api/spike/connect-google/
    route.ts              — Google Connected Accounts linking spike (GET, env-gated)
  api/spike/ciba/
    route.ts              — CIBA + Guardian push notification approval spike (GET, env-gated)
  api/reader/
    route.ts              — Reader Agent POST route (authenticated, production)
  api/orchestrator/
    route.ts              — Orchestrator Agent POST route (authenticated, production)
    execute/
      route.ts            — Execute route: CIBA approval + writer execution + receipt (POST, authenticated)
    rollback/
      route.ts            — Rollback route: build reversal changeset from executed original (POST, authenticated)
  dashboard/
    page.tsx              — Dashboard (server component, auth gate, user session)
    chat.tsx              — Chat interface (client component, fetch-based state machine)
components/ui/
  button.tsx              — shadcn Button wrapping Base UI ButtonPrimitive + CVA
  card.tsx                — shadcn Card (header, title, content, footer)
  badge.tsx               — shadcn Badge (variants: default, secondary, destructive, outline)
  collapsible.tsx         — shadcn Collapsible wrapping Base UI CollapsiblePrimitive
  separator.tsx           — shadcn Separator
  input.tsx               — shadcn Input
  table.tsx               — shadcn Table for markdown table rendering in chat
components/changeset/
  agent-badge.tsx         — Color-coded agent indicator badges (Reader/Writer/Notifier)
  changeset-view.tsx      — Composite view: header, risk summary, operations, rollback, receipt
  operation-card.tsx      — Single operation: action, target, risk badge, diff, result, checks
  risk-badge.tsx          — Color-coded risk tier badge (green/blue/amber/red)
  risk-summary.tsx        — Aggregate risk: ops by tier, CIBA badge, approval counts
  diff-view.tsx           — Field-level before/after diff table
  execution-receipt.tsx   — Receipt: OBO chain, delegations, verification, audit hash
  rollback-section.tsx    — Collapsible rollback instructions per operation
config/
  version-floors.json     — Minimum dependency versions for CVE protection
lib/
  auth0.ts                — Auth0Client singleton (server-only, offline_access + Connected Accounts)
  utils.ts                — cn() utility (clsx + tailwind-merge)
  policy/
    types.ts              — Risk tier, PolicyFact, PolicyDecision types
    engine.ts             — json-rules-engine rules + evaluatePolicy()
  changeset/
    types.ts              — ChangeSet, Operation, RiskSummary, ExecutionReceipt types
    builder.ts            — buildChangeSet(): policy evaluation + diff + rollback assembly
    approval.ts           — CIBA approval: dynamic binding messages, RAR authorization details
    executor.ts           — Execution pipeline: approve → write → verify → notify → receipt
    rollback-builder.ts   — buildRollbackChangeSet(): invert diffs, recompute risk, build reversal draft
  agents/
    reader.ts             — Reader Agent: 4 read-only Google Sheets tools + generateText runner
    orchestrator.ts       — Orchestrator Agent: 3-tool workflow (gather → analyze → build)
    writer.ts             — Writer Agent: update_price, set_promo_status, update_inventory_flag, bulk_price_change via Google Sheets write API
    notifier.ts           — Notifier Agent: send_launch_notification via Gmail API + Token Vault OBO
proxy.ts                  — Auth0 proxy intercepting all non-static routes
scripts/
  security-check.sh       — Pre-commit security scanning
  version-floor-check.sh  — Dependency version enforcement
public/                   — Static assets (SVGs)
```

## Peer Dependencies

This project uses Next.js 16.2.1 and React 19.2.4 alongside `@auth0/nextjs-auth0@^4.16.0`. If you encounter peer dependency conflicts during `npm install`, use:

```bash
npm install --legacy-peer-deps
```

## License

MIT
