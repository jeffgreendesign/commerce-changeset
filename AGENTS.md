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
  (content)/
    layout.tsx        — Shared layout for public content pages
    about/page.tsx    — About page
    blog/
      page.tsx        — Blog index
      building-trust-surfaces-for-ai-agents/page.tsx
      how-we-use-auth0-for-ai-agents/page.tsx
    changelog/page.tsx — Public changelog
    privacy/page.tsx  — Privacy policy
    terms/page.tsx    — Terms of service
  api/auth/[auth0]/
    route.ts          — Auth0 route handler (login, logout, callback)
  api/auth/connect-google/
    route.ts          — Google Connected Accounts linking (GET, authenticated)
  api/judges/verify/
    route.ts          — Judge access code verification (POST, constant-time compare)
  api/reader/
    route.ts          — Reader Agent POST route (authenticated, production)
  api/orchestrator/
    route.ts          — Orchestrator Agent POST route (authenticated, production)
    execute/
      route.ts        — Execute route: CIBA approval + writer execution + receipt (POST, authenticated)
    rollback/
      route.ts        — Rollback route: build reversal changeset from executed original (POST, authenticated)
  api/voice/
    route.ts          — Voice agent POST route (Gemini Live orchestration)
    token/route.ts    — Ephemeral voice token endpoint
  api/spike/token-vault/
    route.ts          — Token Vault → Google Sheets spike (GET, env-gated)
  api/spike/connect-google/
    route.ts          — [deprecated] Use /api/auth/connect-google instead (GET, env-gated)
  api/spike/ciba/
    route.ts          — CIBA + Guardian push notification approval spike (GET, env-gated)
  dashboard/
    page.tsx          — Dashboard (server component, auth gate, user session)
    dashboard-client.tsx — Client-side dashboard shell
    chat.tsx          — Chat interface (client component, fetch-based state machine)
    workspace.tsx     — Workspace view wrapper
  demo/
    layout.tsx        — Demo mode layout
    page.tsx          — Demo entry page
    dashboard/page.tsx — Demo dashboard
  judges/
    page.tsx          — Judges entry/auth page
    dashboard/page.tsx — Judges dashboard
components/ui/
  badge.tsx           — shadcn Badge (variants: default, secondary, destructive, outline)
  button.tsx          — shadcn Button wrapping Base UI ButtonPrimitive + CVA
  card.tsx            — shadcn Card (header, title, content, footer)
  collapsible.tsx     — shadcn Collapsible wrapping Base UI CollapsiblePrimitive
  command.tsx         — shadcn Command (combobox / palette)
  dialog.tsx          — shadcn Dialog
  input.tsx           — shadcn Input
  input-group.tsx     — Input with prefix/suffix addon
  scroll-area.tsx     — shadcn ScrollArea
  separator.tsx       — shadcn Separator
  sheet.tsx           — shadcn Sheet (slide-over panel)
  skeleton.tsx        — shadcn Skeleton loading placeholder
  sonner.tsx          — shadcn Toaster (sonner)
  table.tsx           — shadcn Table for markdown table rendering in chat
  textarea.tsx        — shadcn Textarea
  tooltip.tsx         — shadcn Tooltip wrapping Base UI TooltipPrimitive
components/changeset/
  agent-badge.tsx     — Color-coded agent indicator badges (Reader/Writer/Notifier)
  changeset-skeleton.tsx — Loading skeleton for changeset cards
  changeset-view.tsx  — Composite view: header, risk summary, operations, rollback, receipt
  delegation-graph.tsx — Visual agent delegation graph
  delegation-status.ts — Delegation status helpers
  diff-view.tsx       — Field-level before/after diff table
  execution-receipt.tsx — Receipt: OBO chain, delegations, verification, audit hash
  operation-card.tsx  — Single operation: action, target, risk badge, diff, result, checks
  risk-badge.tsx      — Color-coded risk tier badge (green/blue/amber/red)
  risk-summary.tsx    — Aggregate risk: ops by tier, CIBA badge, approval counts
  rollback-section.tsx — Collapsible rollback instructions per operation
components/dashboard/
  agent-activity.tsx  — Agent activity feed with tool call timeline
  agent-trace-card.tsx — Individual agent trace card
  bulk-suggestion-card.tsx — Bulk action suggestion card
  chat-history-panel.tsx — Chat history sidebar panel
  ciba-approval-gate.tsx — CIBA approval waiting UI
  command-palette.tsx — Command palette (Cmd+K)
  inspector.tsx       — Inspector panel
  intent-cards.tsx    — Intent suggestion cards
  layout-shell.tsx    — Dashboard layout shell (rail + content)
  proactive-issues-card.tsx — Proactive issue detection card
  product-data-view.tsx — Product data table view
  providers.tsx       — Client-side provider composition
  quick-action-confirm-dialog.tsx — Quick action confirmation dialog
  quick-actions-panel.tsx — Quick actions panel with agent tags
  rail.tsx            — Navigation rail (sidebar)
  status-bar.tsx      — Status bar
  theme-toggle.tsx    — Dark/light theme toggle
  tool-call-row.tsx   — Tool call detail row
  voice-controls.tsx  — Voice input controls
  voice-indicator.tsx — Voice activity indicator
  voice-provider.tsx  — Voice session provider (Gemini Live)
  workflow-pipeline.tsx — Workflow pipeline visualization
components/workspace/
  action-hint.tsx     — Contextual action hints
  ambient-layer.tsx   — Ambient background layer
  changeset-summary.tsx — Changeset summary card
  drafts-view.tsx     — Drafts list view
  inspector-panel.tsx — Workspace inspector panel
  intent-bar.tsx      — Intent input bar
  living-surface.tsx  — Living surface (animated workspace)
  product-action-sheet.tsx — Product action sheet
  product-tile.tsx    — Product tile card
  timeline-view.tsx   — Timeline history view
  workspace-actions-sheet.tsx — Workspace actions bottom sheet
  workspace-provider.tsx — Workspace state provider (context)
components/demo/
  demo-annotation-provider.tsx — Demo annotation context provider
  demo-annotation-toggle.tsx — Toggle for demo annotations
  demo-annotation.tsx — Individual demo annotation overlay
  demo-insight-bar.tsx — Demo insight bar
  demo-suggestion-chips.tsx — Demo suggestion chip row
  mock-ciba-approval.tsx — Mock CIBA approval UI for demo
  token-vault-activity.tsx — Token Vault activity visualization
components/
  architecture-diagram.tsx — Architecture diagram component
  footer.tsx          — Site footer
lib/
  actions.ts          — Server actions and risk metadata
  api-error.ts        — Centralized API error helper (apiError + error codes)
  auth0.ts            — Auth0Client singleton (server-only, offline_access + Connected Accounts)
  chat-history.ts     — Chat history persistence
  navigation-types.ts — Navigation type definitions
  pipeline-phase.ts   — Pipeline phase enum/types
  risk-tier-config.ts — Risk tier display config (TIER_CONFIG)
  timeline-history.ts — Timeline history helpers
  utils.ts            — cn() utility (clsx + tailwind-merge)
  policy/
    types.ts          — Risk tier, PolicyFact, PolicyDecision types
    engine.ts         — json-rules-engine rules + evaluatePolicy()
    escalation-explanation.ts — Human-readable escalation explanations
  changeset/
    types.ts          — ChangeSet, Operation, RiskSummary, ExecutionReceipt types
    builder.ts        — buildChangeSet(): policy evaluation + diff + rollback assembly
    approval.ts       — CIBA approval: dynamic binding messages, RAR authorization details
    executor.ts       — Execution pipeline: approve → write → verify → notify → receipt
    rollback-builder.ts — buildRollbackChangeSet(): invert diffs, recompute risk, build reversal draft
  agents/
    reader.ts         — Reader Agent: 4 read-only Google Sheets tools + generateText runner
    orchestrator.ts   — Orchestrator Agent: 3-tool workflow (gather → analyze → build)
    writer.ts         — Writer Agent: update_price, set_promo_status, update_inventory_flag, bulk_price_change, create_product via Google Sheets write API
    notifier.ts       — Notifier Agent: send_launch_notification, send_execution_receipt via Gmail API + Token Vault OBO
  demo/
    classifier.ts     — Demo scenario classifier (keyword matching)
    config.ts         — Demo mode client config
    config.server.ts  — Demo mode server config (env-gated)
    mock-data.ts      — Mock product catalog, launches, session
    scenarios.ts      — Pre-built demo changeset scenarios
  hooks/
    use-gemini-live.ts — Gemini Live voice session hook
    use-is-mobile.ts  — Mobile viewport detection hook
    use-keyboard-shortcuts.ts — Keyboard shortcut hook
    use-navigation-history.ts — Navigation history hook
  judges/
    config.ts         — Judges client config
    config.server.ts  — Judges server config (access code validation)
  voice/
    gemini-live.ts    — Gemini Live WebSocket client
    proactive-insights.ts — Proactive issue detection from product data
    repetition-detector.ts — Voice workflow repetition detection
    session-insights.ts — Voice session insight aggregation
    sheets-persistence.ts — Google Sheets persistence for voice sessions
    types.ts          — Voice-related type definitions
proxy.ts              — Auth0 proxy intercepting all non-static routes
public/               — Static assets (SVGs)
```

## Coding Conventions

- **Server components by default.** Only add `"use client"` when the component needs browser APIs, event handlers, or hooks.
- **TypeScript strict mode.** No `any` types. Use zod for runtime validation at system boundaries.
- **Import alias:** `@/*` maps to the project root. Use `@/lib/auth0`, `@/components/ui/button`, etc.
- **Styling:** Use Tailwind utility classes with theme tokens (e.g., `bg-primary`, `text-muted-foreground`). Avoid arbitrary values when a token exists.
- **Components:** shadcn components live in `components/ui/`. They wrap Base UI primitives and use CVA for variant definitions. Use `cn()` from `@/lib/utils` for conditional class merging.
- **Adding components:** Run `npx shadcn@latest add <component>` to scaffold new UI components into `components/ui/`.
- **Mobile input font size:** All `<input>`, `<textarea>`, and `<select>` elements must use `text-base` (16px) on mobile to prevent iOS Safari auto-zoom on focus. Use the `text-base md:text-sm` pattern to step down on desktop. A CSS guardrail in `globals.css` enforces `font-size: 1rem` on mobile as a safety net, but component-level classes should still follow this convention.

## Google Sheets Data Contract

The app reads from two sheets in the Stride Athletics Google Sheet:

- **Products sheet** — columns: SKU, Name, Category, Base Price, Promo Price, Promo Active, Inventory, Image URL
- **Launch Schedule sheet** — columns: Launch ID, Name, Start Date, End Date, Status, SKUs, Discount %

### Inventory field (dual-format)

Production Sheets store Inventory as **either** numeric counts (`"450"`, `"60"`, `"8"`) **or** status flags (`"in_stock"`, `"low_stock"`, `"out_of_stock"`, `"discontinued"`, `"pre_order"`). Both formats are valid; the system must handle both during the migration to flag-based inventory:

- **Reader Agent** — passes raw values from Sheets without transformation.
- **Writer Agent** — only writes status flags (validated by `VALID_INVENTORY_FLAGS` in `lib/agents/writer.ts`). The writer never writes numeric counts.
- **Orchestrator prompt** — instructs the LLM to map user numeric requests to flags before creating write operations (0 → `out_of_stock`, 1–10 → `low_stock`, >10 → `in_stock`).
- **UI display** — `inventoryLabel()` in `components/workspace/workspace-provider.tsx` handles both: flags → human labels (e.g., `"In Stock"`), numbers → unit display (e.g., `"450 units"`).
- **Mock data** — `lib/demo/mock-data.ts` intentionally uses a mix of numeric and flag values to mirror production and exercise both `inventoryLabel()` branches.

## Agent Behavior

- **Read Next.js docs first.** Before modifying Next.js patterns (routing, middleware, data fetching), read the relevant guide in `node_modules/next/dist/docs/`.
- **Lint before committing.** Run `npm run lint` and fix all issues before any commit.
- **No hardcoded secrets.** Auth0 credentials, API keys, and sensitive values must come from environment variables defined in `.env.local`. Never log or expose them.
- **Error handling:** Prefer early returns over nested try/catch. Only catch errors at system boundaries (API routes, external service calls).
- **PR expectations:** PR descriptions must explain what changed and why. Keep PRs focused on one logical change.
- **Logging:** Use `console.error` for errors that need attention. Avoid verbose console.log in production code paths.

## Changelog

- **Every PR that changes code must update `CHANGELOG.md`.** CI enforces this via `.github/workflows/changelog-check.yml` (GitHub Actions).
- Add entries under `## [Unreleased]` using the existing categories: Features, Fixes, Content, Refactoring, Style, Chores, Docs, Security.
- Format: `- Description of what changed (PR \`#N\`)` — include the PR number when available.
- Docs-only PRs (only `.md` files changed) are automatically exempt.
- If a PR truly doesn't need a changelog entry (CI-only, refactor), add the `skip-changelog` label instead.

## Auth0 Integration

Auth0 v4 uses a middleware-based pattern (not the legacy `handleAuth()` route handler).

- **Client:** `lib/auth0.ts` exports a singleton `Auth0Client` from `@auth0/nextjs-auth0/server`. This is server-only — never import it in client components.
- **Proxy:** `proxy.ts` calls `auth0.middleware(request)` to handle `/auth/login`, `/auth/logout`, `/auth/callback`, and session cookie management. It intercepts all routes except static assets.
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
