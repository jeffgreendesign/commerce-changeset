# Changelog

All notable changes to this project will be documented in this file.

**Categories:** Features, Fixes, Content, Refactoring, Style, Chores, Docs, Security

## [Unreleased]

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
