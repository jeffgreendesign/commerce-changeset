# Changelog

All notable changes to this project will be documented in this file.

Format: [Keep a Changelog](https://keepachangelog.com/)

## [Unreleased]

## [0.2.0] — 2026-03-31

### Added

#### Dashboard Modernization (PR #6)

- Three-panel layout with workflow pipeline stepper and skeleton loading
- Dark mode support with system preference detection
- Toast notifications (Sonner) and persistent status bar
- CIBA approval gate in workflow pipeline
- Agent theater view with intent cards and delegation graph

#### Gemini Real-time Voice (PRs #7–8)

- Gemini Live API integration for voice input
- Contextual intelligence with proactive insight generation
- Dual-model voice types with `@google/genai` SDK and audio worklet
- `useGeminiLive` React hook for voice session management
- Sheets-backed voice session persistence
- iOS Safari and Liquid Glass UI optimization

#### Quick Actions (PRs #11, #15)

- Quick Actions sidebar with agent workflow panel
- Filterable action cards with risk-tier indicators
- Confirmation dialog before execution
- Extracted `RISK_META` to shared module (`lib/risk-tier-config.ts`)

#### Product Creation (PR #12)

- `create_product` Writer Agent action with execution-level guardrails

#### Content Pages (PR #14)

- About page, Terms of Service, Privacy Policy
- Blog post: "Building Trust Surfaces for AI Agents"
- Site-wide footer component

#### Living Workspace Design Spec (PR #20)

- `docs/living-workspace-design-spec.md` — five-phase design spec for post-chat UI paradigm

#### Living Workspace — Phase 1: Living Surface Foundation (PR #21)

- Living Surface with product tile grid and selection model
- Product tiles with ambient status indicators
- Intent bar: voice-first command surface with text fallback
- Context Spine icon navigation rail
- `WorkspaceProvider` React context for workspace state
- Vercel preview deployment configuration

#### Living Workspace — Phase 2: Changeset Materialization (PR #22)

- In-place diff overlays on product tiles
- Changeset summary floating panel with operation count and risk assessment
- Drafts view accessible from Context Spine
- Contextual chips that prefill intent bar
- Field-level diffs in changeset summary

#### Living Workspace — Phase 3: Inspector & Timeline (PR #23)

- Inspector panel with inline field editing
- Timeline view showing chronological activity history
- Activity view with agent trace cards
- Shared `TIER_CONFIG` module, draft cleanup logic, execution metadata enrichment

### Changed

- Dashboard migrated from single chat panel to three-panel layout (PR #6)

### Fixed

- Mobile & desktop UI polish: product data views, chat history, content containment, premium surfaces (PRs #9–10)
- Card overflow and Quick Actions scrolling (PR #13)
- Mobile navigation: full title display and homepage link (PR #16)
- iOS zoom prevention: 16px minimum font-size on mobile inputs (PR #17)
- Inventory display, operation card overflow, voice delay and volume (PR #18)
- Quick Actions "Run Action" not submitting prompt on mobile (PR #19)

### Security

- Execution-level guardrails on all Writer Agent write operations (PR #12)
- Formula injection sanitization for Google Sheets cell values (PR #12)

## [0.1.0] — 2026-03-24

### Added

- Next.js 16 App Router project with TypeScript strict mode
- Auth0 v4 authentication: client singleton, proxy middleware, route handler
- Vercel AI SDK (`ai`, `@auth0/ai-vercel`) integration
- json-rules-engine for business rule evaluation
- Zod for runtime schema validation
- Home page with login/logout UI
- shadcn/ui Button component (Base UI + CVA)
- Tailwind CSS v4 with CSS-based theme config (oklch colors, dark mode)
- Auth0 Token Vault → Google Sheets spike route (`/api/spike/token-vault`)
- Google Connected Accounts spike route (`/api/spike/connect-google`) for Token Vault account linking
- CIBA + Guardian spike route (`/api/spike/ciba`) for push notification approval flow
- Policy engine (`lib/policy/`) with json-rules-engine: risk tier evaluation (Tier 0–3), 5 rules, typed `evaluatePolicy()` function
- Reader Agent (`lib/agents/reader.ts`) with Token Vault OBO delegation: `get_products`, `get_pricing`, `get_launch_schedule`, `get_launch_windows` tools
- `/api/reader` POST route: authenticated natural-language product queries via Reader Agent + Vercel AI SDK
- Change Set data model (`lib/changeset/types.ts`): ChangeSet, Operation, RiskSummary, ExecutionReceipt types
- Change Set builder (`lib/changeset/builder.ts`): per-operation policy evaluation, diff computation, rollback generation
- Orchestrator Agent (`lib/agents/orchestrator.ts`): 3-tool workflow (gather → analyze → build) for natural-language change set assembly
- `POST /api/orchestrator` route: authenticated change set assembly from natural-language prompts
- Writer Agent (`lib/agents/writer.ts`) with Token Vault OBO delegation: `update_price`, `set_promo_status` tools for Google Sheets writes
- CIBA approval module (`lib/changeset/approval.ts`): reusable CIBA + Guardian approval flow with dynamic binding messages from change sets
- Change Set executor (`lib/changeset/executor.ts`): full execution pipeline with CIBA approval, writer execution, verification read-back, and receipt generation
- `POST /api/orchestrator/execute` route: authenticated change set execution with CIBA approval and execution receipts
- Notifier Agent (`lib/agents/notifier.ts`) with Token Vault OBO delegation: `send_launch_notification` tool for Gmail API sends
- Notifier integration in executor pipeline: non-blocking email notification after verification, with delegation recorded in execution receipt
- Dashboard page (`/dashboard`) with auth gate and chat interface for interacting with agents
- Chat client component with state machine: idle → loading → draft → executing → complete
- Change Set diff view components (`components/changeset/`): operation cards, risk badges, diff tables, risk summary, execution receipt display, collapsible rollback instructions
- shadcn/ui components: Card, Badge, Collapsible, Separator, Input
- Quality gates: `npm run gates` runs lint + typecheck + build
- CI workflow with GitHub Actions
- Changelog enforcement CI check
- Pre-commit hooks via Husky (security scanning, lint)
- Version floor enforcement for CVE protection (`config/version-floors.json`)
- Security scanning script (`scripts/security-check.sh`)
- `.env.example` with placeholder credentials
- `llms.txt` for LLM-friendly project summary
- Project docs: CLAUDE.md, AGENTS.md, CONTRIBUTING.md
- Writer Agent tools: `update_inventory_flag` (inventory management) and `bulk_price_change` (batch price updates)
- Rollback execution: `POST /api/orchestrator/rollback` route + `lib/changeset/rollback-builder.ts` for building reversal changesets
- Rollback UI: execute button in receipt, `rolling_back` chat phase, spinner/disabled state separation
- Read-only query support: Reader Agent responses rendered as formatted markdown with GFM tables
- shadcn Table component (`components/ui/table.tsx`) for markdown table rendering in chat
- Agent badge component (`components/changeset/agent-badge.tsx`): color-coded by agent type
- Autonomy badges, tool call chips, and context boundary indicators in delegation tree
- Clickable risk badges expanding to full policy explanation
- `react-markdown` and `remark-gfm` dependencies for markdown rendering

### Changed

- Migrated `middleware.ts` to `proxy.ts` for Auth0 middleware pattern
- Moved `shadcn` to devDependencies
- Deferred Auth0AI initialization to request time (fixes Vercel build)
- Auth0Client now requests `offline_access` scope and enables Connected Accounts endpoint
- Orchestrator action enum expanded: added `update_inventory_flag`, `bulk_price_change`
- Chat state machine: added `rolling_back` phase
- Chat Message type: added `readResult` and `rollbackDraftId` fields

### Fixed

- `@auth0/ai-vercel` dependency version and peer property
- Button hover variant styling
- `.gitignore` updated to exclude `.env*.local` files
- Added `setAIContext()` call in token-vault route (fixes "No AI context found" error)
- Connected Accounts flow: login with `/me/` audience to get JWT with `create:me:connected_accounts` scope
- Rollback flow hardening: JSON parse guard, phase guard, stable IDs, initiator propagation
- Rollback spinner separated from disabled state across operation cards

### Security

- Hardened token-vault route: scope validation, error codes, environment gate
- Google OAuth connection requires own credentials (not Auth0 dev keys) for Token Vault
