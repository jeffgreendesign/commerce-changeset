# Changelog

All notable changes to this project will be documented in this file.

Format: [Keep a Changelog](https://keepachangelog.com/)

## [Unreleased]

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
- Quality gates: `npm run gates` runs lint + typecheck + build
- CI workflow with GitHub Actions
- Changelog enforcement CI check
- Pre-commit hooks via Husky (security scanning, lint)
- Version floor enforcement for CVE protection (`config/version-floors.json`)
- Security scanning script (`scripts/security-check.sh`)
- `.env.example` with placeholder credentials
- `llms.txt` for LLM-friendly project summary
- Project docs: CLAUDE.md, AGENTS.md, CONTRIBUTING.md

### Changed

- Migrated `middleware.ts` to `proxy.ts` for Auth0 middleware pattern
- Moved `shadcn` to devDependencies
- Deferred Auth0AI initialization to request time (fixes Vercel build)
- Auth0Client now requests `offline_access` scope and enables Connected Accounts endpoint

### Fixed

- `@auth0/ai-vercel` dependency version and peer property
- Button hover variant styling
- `.gitignore` updated to exclude `.env*.local` files
- Added `setAIContext()` call in token-vault route (fixes "No AI context found" error)
- Connected Accounts flow: login with `/me/` audience to get JWT with `create:me:connected_accounts` scope

### Security

- Hardened token-vault route: scope validation, error codes, environment gate
- Google OAuth connection requires own credentials (not Auth0 dev keys) for Token Vault
