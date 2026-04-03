import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How It Works | Commerce Changeset",
  description:
    "Architecture overview: multi-agent orchestration, Token Vault OBO delegation, stress-aware authorization, and auditable execution receipts.",
};

const agents = [
  {
    name: "Reader",
    color: "text-blue-500 dark:text-blue-400",
    bg: "bg-blue-500/10",
    description:
      "Pulls product data, pricing, and launch schedules from Google Sheets via Token Vault OBO. Read-only — cannot modify any data.",
    tools: "get_products, get_pricing, get_launch_schedule, get_launch_windows",
    scope: "spreadsheets.readonly",
    scopeLabel: "Read-only",
    scopeColor:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  },
  {
    name: "Orchestrator",
    color: "text-foreground",
    bg: "bg-foreground/5",
    description:
      "Decomposes natural language into discrete operations. Evaluates each against the policy engine, generates diffs, and assembles the changeset with rollback instructions.",
    tools: "gather_state, analyze_request, build_changeset",
    scope: "none",
    scopeLabel: "No API access — plans only",
    scopeColor:
      "bg-muted text-muted-foreground border-border",
  },
  {
    name: "Writer",
    color: "text-amber-500 dark:text-amber-400",
    bg: "bg-amber-500/10",
    description:
      "Executes approved operations against Google Sheets. Deterministic — no LLM involved. Loops over approved ops and calls the matching write tool.",
    tools:
      "update_price, set_promo_status, update_inventory_flag, bulk_price_change, create_product",
    scope: "spreadsheets",
    scopeLabel: "Read-write",
    scopeColor:
      "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  },
  {
    name: "Notifier",
    color: "text-emerald-500 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    description:
      "Sends execution summaries and detailed audit receipts via Gmail using Token Vault OBO. Deterministic — templates the email from changeset data.",
    tools: "send_launch_notification",
    scope: "gmail.send",
    scopeLabel: "Send-only",
    scopeColor:
      "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  },
];

const riskTiers = [
  {
    tier: "Tier 0 — READ",
    color: "text-emerald-600 dark:text-emerald-400",
    decision: "Auto-approve",
    description: "Read-only queries. No approval required.",
  },
  {
    tier: "Tier 1 — NOTIFY",
    color: "text-blue-600 dark:text-blue-400",
    decision: "Auto-approve",
    description: "Notification-only operations. Email sent, no data modified.",
  },
  {
    tier: "Tier 2 — WRITE",
    color: "text-amber-600 dark:text-amber-400",
    decision: "CIBA required",
    description:
      "Single-record writes. Guardian push notification sent for user approval.",
  },
  {
    tier: "Tier 3 — BULK",
    color: "text-red-600 dark:text-red-400",
    decision: "CIBA escalated",
    description:
      "Bulk writes, large price changes, or stress-escalated operations. Highest friction approval.",
  },
];

const pipelineSteps = [
  {
    step: "1",
    label: "Approve",
    description:
      "CIBA request sent to Auth0 Guardian. User approves via push notification on their device.",
  },
  {
    step: "2",
    label: "Write",
    description:
      "Writer Agent executes each approved operation against Google Sheets using scoped OBO tokens.",
  },
  {
    step: "3",
    label: "Verify",
    description:
      "Reader Agent reads back the modified data and compares against expected values.",
  },
  {
    step: "4",
    label: "Notify",
    description:
      "Notifier Agent sends an execution summary and detailed audit receipt via Gmail.",
  },
  {
    step: "5",
    label: "Receipt",
    description:
      "SHA-256 audit hash computed over the full execution record: delegations, results, and verification checks.",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        How It Works
      </h1>
      <p className="mt-3 text-lg leading-relaxed text-muted-foreground">
        Commerce Changeset is a multi-agent system that manages commerce
        operations &mdash; pricing, promotions, inventory, product creation
        &mdash; through auditable, authorization-gated workflows. Every action
        flows through Auth0&apos;s identity layer.
      </p>

      {/* Agent Pipeline */}
      <section className="mt-14">
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
          The Agent Pipeline
        </h2>
        <p className="mt-2 text-muted-foreground">
          Four specialized agents, each with bounded capabilities and scoped
          token access.
        </p>
        <div className="mt-6 space-y-4">
          {agents.map((agent) => (
            <div
              key={agent.name}
              className={`rounded-lg border border-border ${agent.bg} px-5 py-4`}
            >
              <h3 className={`font-semibold ${agent.color}`}>{agent.name}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {agent.description}
              </p>
              <p className="mt-2 font-mono text-xs text-muted-foreground">
                {agent.tools}
              </p>
              <span
                className={`mt-2 inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${agent.scopeColor}`}
              >
                {agent.scopeLabel}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Token Vault Flow */}
      <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
        <strong className="text-foreground">Token Vault Flow:</strong> User
        connects Google once via Auth0 Connected Accounts. Auth0 stores the
        refresh token in Token Vault. Each agent exchanges for a scoped access
        token at execution time. Tokens never reach the frontend.
      </p>

      {/* Token Vault OBO */}
      <section className="mt-14">
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
          Token Vault &amp; OBO Delegation
        </h2>
        <p className="mt-2 leading-relaxed text-muted-foreground">
          Users connect their Google account once via Auth0 Connected Accounts.
          Auth0 stores the refresh token in Token Vault. At execution time, each
          agent exchanges the stored token for a scoped access token through
          Auth0&apos;s On-Behalf-Of flow. The app never sees or stores the
          user&apos;s Google credentials directly.
        </p>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Every token exchange is recorded in the execution receipt with a
          unique exchange ID, timestamp, and the scopes granted &mdash; creating
          a complete audit trail of what each agent accessed and when.
        </p>
      </section>

      {/* Risk Tiers */}
      <section className="mt-14">
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
          Policy Engine &amp; Risk Tiers
        </h2>
        <p className="mt-2 text-muted-foreground">
          Every operation is evaluated by a json-rules-engine policy engine
          before execution. The engine considers operation type, affected record
          count, price change magnitude, and the user&apos;s voice-derived
          stress and session duration signals.
        </p>
        <div className="mt-6 space-y-3">
          {riskTiers.map((tier) => (
            <div
              key={tier.tier}
              className="flex flex-col gap-1 rounded-lg border border-border px-4 py-3 sm:flex-row sm:items-baseline sm:gap-4"
            >
              <span className={`text-sm font-semibold ${tier.color}`}>
                {tier.tier}
              </span>
              <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium">
                {tier.decision}
              </span>
              <span className="text-sm text-muted-foreground">
                {tier.description}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Execution Pipeline */}
      <section className="mt-14">
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
          Execution Pipeline
        </h2>
        <p className="mt-2 text-muted-foreground">
          Once the user confirms a changeset, it flows through a five-step
          pipeline. Each step is recorded for the audit trail.
        </p>
        <div className="mt-6 space-y-4">
          {pipelineSteps.map((s) => (
            <div key={s.step} className="flex gap-4">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border text-sm font-semibold">
                {s.step}
              </div>
              <div>
                <h3 className="text-sm font-semibold">{s.label}</h3>
                <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                  {s.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Voice + Stress-Aware Auth */}
      <section className="mt-14">
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
          Voice Interface &amp; Stress-Aware Authorization
        </h2>
        <p className="mt-2 leading-relaxed text-muted-foreground">
          The voice interface uses a dual-model architecture. A primary Gemini
          Live model handles conversation and tool calls. A silent sidecar model
          analyzes the audio stream for stress markers &mdash; pitch variance,
          pace changes, hesitation patterns &mdash; and emits emotional state
          transitions without producing any spoken output.
        </p>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          These affective signals feed into the policy engine. When the
          user&apos;s stress level exceeds 0.7 or the session exceeds 60
          minutes, write operations are escalated from Tier 2 to Tier 3. The
          system adds friction when the user&apos;s judgment may be degraded
          &mdash; a first step toward authorization that adapts to cognitive
          state, not just permission grants.
        </p>
      </section>

      {/* Audit */}
      <section className="mt-14">
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
          Audit Trail
        </h2>
        <p className="mt-2 leading-relaxed text-muted-foreground">
          Every execution produces an immutable receipt containing the OBO
          delegation chain (user to orchestrator to individual agents), per-agent
          delegation records with tools granted and context scope, verification
          check results, and a SHA-256 audit hash over the complete record. The
          receipt is emailed to the user and displayed in the dashboard&apos;s
          delegation graph.
        </p>
      </section>
    </div>
  );
}
