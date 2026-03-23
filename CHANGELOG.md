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
