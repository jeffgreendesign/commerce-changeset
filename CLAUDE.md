# CLAUDE.md

## Project Overview

Commerce Changeset -- a Next.js 16 application for managing commerce change workflows with Auth0 authentication, Vercel AI SDK integration, and json-rules-engine for business rules.

## Workflow

- **Small changes** (single file, typo, bug fix): implement directly
- **Multi-file changes or new patterns** (3+ files, new subsystem, unfamiliar area): research the codebase and propose an approach before implementing -- wait for approval before writing code
- Always run `npm run verify` before finishing any task

## Quick Reference

| Aspect          | Value                          |
|-----------------|--------------------------------|
| Package manager | npm                            |
| Runtime         | Node.js >= 22                  |
| Language        | TypeScript (strict mode)       |
| Framework       | Next.js 16 (App Router)        |
| Lint            | `npm run lint`                 |
| Type check      | `npm run typecheck`            |
| Build           | `npm run build`                |
| **All checks**  | **`npm run gates`** (alias: `npm run verify`) |
| Version floors  | `config/version-floors.json`   |

## Development Commands

```bash
# Development
npm run dev

# Quality gates (run before every commit)
npm run gates   # alias: verify

# Individual checks
npm run lint
npm run typecheck
npm run build
```

@AGENTS.md
