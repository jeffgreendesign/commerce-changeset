import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Changelog | Commerce Changeset",
  description:
    "Development timeline for Commerce Changeset — built in 8 days for the Auth0 Authorized to Act hackathon.",
};

interface ChangelogEntry {
  date: string;
  title: string;
  items: string[];
}

const entries: ChangelogEntry[] = [
  {
    date: "Apr 3",
    title: "Submission Hardening",
    items: [
      "Reader Agent OAuth scope narrowed to spreadsheets.readonly (per-agent isolation)",
      "README restructured for Devpost submission format",
      "About page: OAuth scope badges per agent (Reader read-only, Writer read-write, Notifier send-only)",
      "Blog post updated: per-agent scope isolation moved from future work to accomplishment",
      "Demo mode: 4 complete scenarios (discount, bulk, read-only, rollback) with mock Auth0 login",
    ],
  },
  {
    date: "Mar 29",
    title: "Content & Polish",
    items: [
      "Quick Actions card overflow and scrolling fixes",
      "Accessibility refinements (aria-hidden, stable keys, filter input)",
      "Create product action with execution-level guardrails and formula injection sanitization",
      "Content pages: blog, about, changelog, privacy, terms",
      "Site-wide footer component",
    ],
  },
  {
    date: "Mar 28",
    title: "Desktop UI Elevation",
    items: [
      "Content containment and premium surface treatments",
      "Adaptive spacing and shadow token refinements",
      "Card CVA variant fixes and px-safe conflict resolution",
    ],
  },
  {
    date: "Mar 27",
    title: "Mobile & Session Management",
    items: [
      "iOS Safari and Liquid Glass optimization",
      "Compact pipeline UI for mobile viewports",
      "Chat history with session persistence and auto-save",
      "Draft rehydration and loading guards",
      "Reduced-motion support and zoom accessibility",
    ],
  },
  {
    date: "Mar 26",
    title: "Voice Integration & Dashboard Modernization",
    items: [
      "Gemini Live dual-model voice integration (conversational + affective sidecar)",
      "AudioWorklet for real-time audio processing",
      "Pattern detection and Google Sheets voice session persistence",
      "Three-panel dashboard layout with dark mode and toasts",
      "Workflow pipeline stepper and CIBA approval gate UI",
      "Agent theater, intent cards, and delegation graph visualization",
      "Quick Actions sidebar with 2027-style agent workflow panel",
    ],
  },
  {
    date: "Mar 24–25",
    title: "Rollback & Read-Only Queries",
    items: [
      "Rollback changeset builder — invert diffs, recompute risk, reverse operations",
      "Rollback execution button with phase guards and stable IDs",
      "Read-only query support with formatted markdown results",
      "Autonomy badges, tool call chips, and context boundary indicators",
      "Orchestrator decomposition prompt improvements",
    ],
  },
  {
    date: "Mar 23",
    title: "Core Agent Pipeline",
    items: [
      "Token Vault spike — Google Sheets integration via OBO delegation",
      "Connected Accounts flow for Google OAuth linking",
      "CIBA + Guardian spike — push notification approval flow",
      "Reader Agent with 4 read-only Google Sheets tools",
      "Policy engine with json-rules-engine (7 risk evaluation rules)",
      "Orchestrator Agent — gather, analyze, build changeset pipeline",
      "Writer Agent — deterministic execution against Google Sheets",
      "CIBA approval flow with dynamic binding messages and sanitization",
      "Notifier Agent — Gmail execution summaries and audit receipts via Token Vault",
      "Dashboard page with chat interface",
      "Changeset display components (operation cards, risk badges, diff views)",
    ],
  },
  {
    date: "Mar 22",
    title: "Project Foundation",
    items: [
      "Next.js 16 App Router with React 19 and TypeScript strict mode",
      "Auth0 v4 integration with middleware-based proxy pattern",
      "Tailwind CSS v4 with oklch color system and glass morphism effects",
      "shadcn/ui + Base UI component scaffolding",
      "CI workflow, pre-commit hooks, and quality gates (lint + typecheck + build)",
      "Version floor checks and security scanning",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        Changelog
      </h1>
      <p className="mt-2 text-lg text-muted-foreground">
        Built in 8 days for the{" "}
        <a href="https://authorizedtoact.devpost.com/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-foreground">Authorized to Act: Auth0 for AI Agents</a>{" "}
        hackathon.
      </p>

      <div className="mt-12 space-y-10">
        {entries.map((entry) => (
          <div key={`${entry.date}-${entry.title}`} className="flex gap-6">
            <div className="w-20 shrink-0 pt-1 text-sm font-medium text-muted-foreground">
              {entry.date}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold">{entry.title}</h2>
              <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-muted-foreground">
                {entry.items.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span
                      aria-hidden="true"
                      className="mt-2 size-1 shrink-0 rounded-full bg-muted-foreground/40"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
