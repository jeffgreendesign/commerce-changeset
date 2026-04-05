# Changelog

All notable changes to this project will be documented in this file.

**Categories:** Features, Fixes, Content, Refactoring, Style, Chores, Docs, Security

## [Unreleased]

### Chores

- Sync demo scenario receipts with production executor: add `create_product` to writer toolsGranted, `send_execution_receipt` to notifier toolsGranted
- Restore production-matching mixed numeric/flag inventory values in mock data
- Update AGENTS.md file structure to reflect all current app routes, components, and lib modules
- Update AGENTS.md and llms.txt agent descriptions: add `create_product` (writer) and `send_execution_receipt` (notifier)
- Document Google Sheets data contract and inventory dual-format model in AGENTS.md

### Features

- Add production Google account connection endpoint at `/api/auth/connect-google` (PR `#64`)
- Add demo mode with 4 complete scenarios, mock Auth0 login, Claude Sonnet 4.6 (PR `#30`)
- Add homepage redesign: demo-focused dark landing with animated pipeline (PR `#31`)
- Add mobile dashboard CTAs: long-press product actions + FAB for bulk actions (PR `#32`)
- Add persistent voice agent across view navigation (PR `#43`)
- Add password-gated judges login for competition access (PR `#44`)
- Add enriched demo data to exercise all agent tools and proactive checks (PR `#45`)
- Add Token Vault visibility in demo mode with phase annotations (PR `#39`)
- Add Agent Activity panel wired to chat interaction traces (PR `#41`)
- Add timeline panel with persistent history, session-scoped stats, schema validation (PR `#36`)
- Add CTA button animations: iridescent glow, FAB pulse, risk dot animation (PR `#35`)
- Add chat-style bottom action bar replacing workspace IntentBar (PR `#42`)
- Add product image support via Vercel Blob URLs in Google Sheet (PR `#29`)
- Add architecture diagram (static SVG + React component) (PR `#38`)
- Add demo step delays for sequential execution feel (PR `#34`)
- Add Image URL to writer/orchestrator schema (PR `#33`)

### Fixes

- Fix voice session immediately disconnecting with WebSocket 1007 by replacing `sendClientContent` with `sendRealtimeInput` to avoid mixing input modes
- Fix workspace intent bar erroring on simple questions / read-only queries instead of showing response text
- Fix bottom bar button/input height mismatch on desktop (Send and Mic buttons now match input height at sm+ breakpoint)
- Fix missing voice and visual feedback after changeset execution via voice approval (PR `#29`)
- Add error handling and logging to Gemini Live tool response pipeline to prevent silent failures (PR `#29`)
- Add toast notifications and haptic feedback to voice-triggered execution paths (PR `#29`)
- Fix aria-hidden focus conflict when inspector sheet opens on mobile (PR `#29`)
- Fix price update sync: target matching and cross-view state propagation (PR `#27`)
- Fix taskbar bottom padding on desktop and mobile (PR `#55`)
- Fix pipeline line width to span exactly between first and last dots (PR `#54`)
- Fix workspace-provider error parsing for nested apiError shape (PR `#50`)
- Add distinct CIBA denial handling across executor, UI, and demo (PR `#51`)
- Fix voice panel UI polish — 5 issues from live mobile testing (PR `#43`)
- Fix mobile dock overflow, demo effect, voice glow cutoff (PR `#42`)
- Fix voice UI: prismatic mic glow, centered dock, demo effect (PR `#40`)
- Fix demo annotation phase lag, suppress mutation-only UI on read-only paths (PR `#39`)
- Fix stepper alignment, Zod validation, browser back-button navigation (PR `#37`)
- Fix timeline hydration mismatch via useSyncExternalStore (PR `#36`)
- Fix inventory displaying "0 units" instead of status labels (PR `#33`)
- Fix iOS Safari long-press callout on product tiles (PR `#32`)
- Fix homepage scroll with h-dvh container (PR `#31`)
- Fix blank /demo page proxy bypass (PR `#30`)
- Fix hackathon references to correct name and Devpost link (PR `#57`)

### Content

- Add OAuth scope badges to About page (Reader read-only, Writer read-write, Notifier send-only) (PR `unavailable`)
- Update blog post: move per-agent scope isolation from future work to accomplishment (PR `unavailable`)
- Add blog post: "How We Use Auth0 for AI Agents" (PR `#39`)

### Refactoring

- Add shared `apiError()` helper and standardize API error responses (PR `#50`)
- Extract `filterSuccessfulOps` helper and fix bulk op diff matching (PR `#27`)
- Extract `showExecutionFeedback` helper to deduplicate toast/haptic logic (PR `#29`)
- Code-split demo components and render loading-phase annotations (PR `#39`)
- Unify sidebar: always-visible Rail across all views (PR `#29`)

### Chores

- Add policy engine unit tests with vitest (PR `#47`)
- Add boundary threshold tests for bulk-write and price-change rules (PR `#49`)
- Add lint-staged; scope security check to staged files only (PR `unavailable`)
- Sync mock product catalog and data with live Google Sheet (PRs `#33`, `#53`)

### Docs

- Restructure README for Devpost submission format (problem statement, architecture, Auth0 integration narrative) (PR `unavailable`)
- Add "What Is Real vs. Simulated" section to README (PR `#48`)
- Add screenshot placeholders to README for Devpost submission (PR `#46`)
- Add Production Portability section to README (PR `#53`)
- Update README What's Next with conversation persistence and durable execution (PR `#52`)

### Security

- Narrow Reader Agent OAuth scope from `spreadsheets` to `spreadsheets.readonly` (per-agent scope isolation) (PR `unavailable`)
- Harden judges login with zod validation, timing-safe compare, HttpOnly cookie (PR `#44`)
- Replace static judge cookie with HMAC-signed token (PR `#44`)
- Require non-empty changesetId via zod before execute/approve (PR `#43`)

## [0.2.0] — 2026-03-31

### Features

#### Dashboard Modernization (PR `#6`)

- Add three-panel layout with workflow pipeline stepper and skeleton loading (PR `#6`)
- Add dark mode support with system preference detection (PR `#6`)
- Add toast notifications via Sonner and persistent status bar (PR `#6`)
- Add CIBA approval gate in workflow pipeline (PR `#6`)
- Add agent theater view with intent cards and delegation graph (PR `#6`)

#### Gemini Real-time Voice (PRs `#7`–`#8`)

- Add Gemini Live API integration for voice input (PR `#7`)
- Add contextual intelligence with proactive insight generation (PR `#7`)
- Add dual-model voice types with `@google/genai` SDK and audio worklet (PR `#8`)
- Add `useGeminiLive` React hook for voice session management (PR `#8`)
- Add Sheets-backed voice session persistence (PR `#8`)
- Optimize iOS Safari and Liquid Glass UI (PR `#8`)

#### Quick Actions (PRs `#11`, `#15`)

- Add Quick Actions sidebar with agent workflow panel (PR `#11`)
- Add filterable action cards with risk-tier indicators (PR `#11`)
- Add confirmation dialog before Quick Action execution (PR `#15`)

#### Product Creation (PR `#12`)

- Add `create_product` Writer Agent action with execution-level guardrails (PR `#12`)

#### Living Workspace — Phase 1: Living Surface Foundation (PR `#21`)

- Add Living Surface with product tile grid and selection model (PR `#21`)
- Add product tiles with ambient status indicators (PR `#21`)
- Add intent bar: voice-first command surface with text fallback (PR `#21`)
- Add Context Spine icon navigation rail (PR `#21`)
- Add `WorkspaceProvider` React context for workspace state (PR `#21`)
- Add Vercel preview deployment configuration (PR `#21`)

#### Living Workspace — Phase 2: Changeset Materialization (PR `#22`)

- Add in-place diff overlays on product tiles (PR `#22`)
- Add changeset summary floating panel with operation count and risk assessment (PR `#22`)
- Add drafts view accessible from Context Spine (PR `#22`)
- Add contextual chips that prefill intent bar (PR `#22`)
- Add field-level diffs in changeset summary (PR `#22`)

#### Living Workspace — Phase 3: Inspector & Timeline (PR `#23`)

- Add inspector panel with inline field editing (PR `#23`)
- Add timeline view showing chronological activity history (PR `#23`)
- Add activity view with agent trace cards (PR `#23`)

### Fixes

- Fix product data views, chat history, and compact pipeline on mobile (PR `#9`)
- Fix card overflow and Quick Actions scrolling (PR `#13`)
- Fix mobile navigation: show full title and link to homepage (PR `#16`)
- Fix iOS zoom: enforce 16px minimum font-size on mobile inputs (PR `#17`)
- Fix inventory display, operation card overflow, voice delay and volume (PR `#18`)
- Fix Quick Actions "Run Action" not submitting prompt on mobile (PR `#19`)

### Content

- Add About page, Terms of Service, and Privacy Policy (PR `#14`)
- Add blog post: "Building Trust Surfaces for AI Agents" (PR `#14`)
- Add site-wide footer component (PR `#14`)

### Refactoring

- Migrate dashboard from single chat panel to three-panel layout (PR `#6`)
- Extract `RISK_META` to shared module `lib/risk-tier-config.ts` (PR `#15`)
- Add shared `TIER_CONFIG` module, draft cleanup logic, execution metadata enrichment (PR `#23`)

### Style

- Add content containment, premium surfaces, and adaptive spacing for desktop (PR `#10`)

### Docs

- Add Living Workspace design spec for post-chat UI paradigm (PR `#20`)

### Security

- Add execution-level guardrails on all Writer Agent write operations (PR `#12`)
- Add formula injection sanitization for Google Sheets cell values (PR `#12`)

## [0.1.0] — 2026-03-24

### Features

- Add Next.js 16 App Router project with TypeScript strict mode (initial)
- Add Auth0 v4 authentication: client singleton, proxy middleware, route handler (initial)
- Add Vercel AI SDK (`ai`, `@auth0/ai-vercel`) integration (initial)
- Add json-rules-engine for business rule evaluation (initial)
- Add Zod for runtime schema validation (initial)
- Add home page with login/logout UI (initial)
- Add shadcn/ui Button component (Base UI + CVA) (initial)
- Add Tailwind CSS v4 with CSS-based theme config (oklch colors, dark mode) (initial)
- Add Auth0 Token Vault → Google Sheets spike route (`/api/spike/token-vault`) (initial)
- Add Google Connected Accounts spike route (`/api/spike/connect-google`) for Token Vault account linking (initial)
- Add CIBA + Guardian spike route (`/api/spike/ciba`) for push notification approval flow (initial)
- Add policy engine (`lib/policy/`) with json-rules-engine: risk tier evaluation (Tier 0–3), 5 rules, typed `evaluatePolicy()` function (initial)
- Add Reader Agent (`lib/agents/reader.ts`) with Token Vault OBO delegation: `get_products`, `get_pricing`, `get_launch_schedule`, `get_launch_windows` tools (initial)
- Add `/api/reader` POST route: authenticated natural-language product queries via Reader Agent + Vercel AI SDK (initial)
- Add Change Set data model (`lib/changeset/types.ts`): ChangeSet, Operation, RiskSummary, ExecutionReceipt types (initial)
- Add Change Set builder (`lib/changeset/builder.ts`): per-operation policy evaluation, diff computation, rollback generation (initial)
- Add Orchestrator Agent (`lib/agents/orchestrator.ts`): 3-tool workflow (gather → analyze → build) for natural-language change set assembly (initial)
- Add `POST /api/orchestrator` route: authenticated change set assembly from natural-language prompts (initial)
- Add Writer Agent (`lib/agents/writer.ts`) with Token Vault OBO delegation: `update_price`, `set_promo_status` tools for Google Sheets writes (initial)
- Add CIBA approval module (`lib/changeset/approval.ts`): reusable CIBA + Guardian approval flow with dynamic binding messages from change sets (initial)
- Add Change Set executor (`lib/changeset/executor.ts`): full execution pipeline with CIBA approval, writer execution, verification read-back, and receipt generation (initial)
- Add `POST /api/orchestrator/execute` route: authenticated change set execution with CIBA approval and execution receipts (initial)
- Add Notifier Agent (`lib/agents/notifier.ts`) with Token Vault OBO delegation: `send_launch_notification` tool for Gmail API sends (initial)
- Add Notifier integration in executor pipeline: non-blocking email notification after verification, with delegation recorded in execution receipt (initial)
- Add Dashboard page (`/dashboard`) with auth gate and chat interface for interacting with agents (initial)
- Add chat client component with state machine: idle → loading → draft → executing → complete (initial)
- Add Change Set diff view components (`components/changeset/`): operation cards, risk badges, diff tables, risk summary, execution receipt display, collapsible rollback instructions (initial)
- Add shadcn/ui components: Card, Badge, Collapsible, Separator, Input (initial)
- Add Writer Agent tools: `update_inventory_flag` (inventory management) and `bulk_price_change` (batch price updates) (PR `#4`)
- Add rollback execution: `POST /api/orchestrator/rollback` route + `lib/changeset/rollback-builder.ts` for building reversal changesets (PR `#5`)
- Add rollback UI: execute button in receipt, `rolling_back` chat phase, spinner/disabled state separation (PR `#5`)
- Add read-only query support: Reader Agent responses rendered as formatted Markdown with GFM tables (initial)
- Add shadcn Table component (`components/ui/table.tsx`) for Markdown table rendering in chat (initial)
- Add agent badge component (`components/changeset/agent-badge.tsx`): color-coded by agent type (PR `#2`)
- Add autonomy badges, tool call chips, and context boundary indicators in delegation tree (PRs `#2`, `#3`)
- Add clickable risk badges expanding to full policy explanation (PR `#2`)
- Add `react-markdown` and `remark-gfm` dependencies for Markdown rendering (initial)

### Fixes

- Fix `@auth0/ai-vercel` dependency version and peer property (initial)
- Fix Button hover variant styling (initial)
- Fix `.gitignore` to exclude `.env*.local` files (initial)
- Fix "No AI context found" error by adding `setAIContext()` call in token-vault route (initial)
- Fix Connected Accounts flow: login with `/me/` audience to get JWT with `create:me:connected_accounts` scope (initial)
- Harden rollback flow: JSON parse guard, phase guard, stable IDs, initiator propagation (PR `#5`)
- Separate rollback spinner from disabled state across operation cards (PR `#5`)

### Refactoring

- Migrate `middleware.ts` to `proxy.ts` for Auth0 middleware pattern (initial)
- Move `shadcn` to devDependencies (initial)
- Defer Auth0AI initialization to request time (fixes Vercel build) (initial)
- Expand Auth0Client to request `offline_access` scope and enable Connected Accounts endpoint (initial)
- Expand Orchestrator action enum: add `update_inventory_flag`, `bulk_price_change` (PR `#4`)
- Add `rolling_back` phase to chat state machine (PR `#5`)
- Add `readResult` and `rollbackDraftId` fields to Chat Message type (PR `#5`)

### Chores

- Add quality gates: `npm run gates` runs lint + typecheck + build (initial)
- Add CI workflow with GitHub Actions (initial)
- Add changelog enforcement CI check (initial)
- Add pre-commit hooks via Husky (security scanning, lint) (initial)
- Add version floor enforcement for CVE protection (`config/version-floors.json`) (initial)
- Add security scanning script (`scripts/security-check.sh`) (initial)
- Add `.env.example` with placeholder credentials (initial)
- Add `llms.txt` for LLM-friendly project summary (PR `#3`)

### Docs

- Add project docs: CLAUDE.md, AGENTS.md, CONTRIBUTING.md (initial)

### Security

- Harden token-vault route: scope validation, error codes, environment gate (initial)
- Require own credentials for Google OAuth connection (not Auth0 dev keys) for Token Vault (initial)
