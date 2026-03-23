# Contributing to Commerce Changeset

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
   If you encounter peer dependency conflicts, see the [README](README.md#peer-dependencies) for workarounds.
3. Copy `.env.local` and fill in your Auth0 credentials (see `.env.local` for required variables)
4. Run all quality gates to verify your setup:
   ```bash
   npm run gates
   ```
5. Start the development server:
   ```bash
   npm run dev
   ```

## Branching & PRs

- Branch from `main`
- Use `feature/<name>` for new features, `fix/<name>` for bug fixes
- One logical change per PR
- PR descriptions must explain what changed and why

## Coding Standards

- TypeScript strict mode — no `any` types
- Server components by default; add `"use client"` only when necessary
- Use `cn()` from `@/lib/utils` for conditional Tailwind classes
- Use CVA variants for component styling, not inline ternaries
- Import via the `@/*` path alias
- Use theme tokens (`bg-primary`, `text-muted-foreground`) over arbitrary Tailwind values

## Commit Messages

- Imperative mood, lowercase: `fix button hover variant`
- Keep the first line under 72 characters
- No co-author trailers

## Review Checklist

- [ ] TypeScript compiles without errors (`npm run build`)
- [ ] ESLint passes (`npm run lint`)
- [ ] No hardcoded secrets or environment values
- [ ] New components follow the shadcn/Base UI + CVA pattern
- [ ] Tailwind classes use theme tokens, not arbitrary values
- [ ] Server components are the default; `"use client"` is justified

## CI Requirements

- `npm run gates` must pass (runs lint + typecheck + build)
- Equivalent to running `npm run lint`, `npm run typecheck`, and `npm run build` individually
