import type { Metadata } from "next";
import Link from "next/link";
import { ArchitectureDiagram } from "@/components/architecture-diagram";

export const metadata: Metadata = {
  title:
    "How We Use Auth0 for AI Agents | Commerce Changeset",
  description:
    "Four Auth0 pillars powering multi-agent commerce: Token Vault OBO delegation, CIBA approval, stress-aware risk escalation, and auditable receipts.",
};

// ── Inline Token Flow Diagram ──────────────────────────────────────

function TokenFlowDiagram() {
  return (
    <svg
      viewBox="0 0 720 160"
      className="mx-auto mt-6 mb-2 w-full max-w-2xl"
      role="img"
      aria-label="Token Vault OBO flow: User Session exchanges refresh token through Auth0 Token Vault for a scoped Google API access token"
    >
      {/* Boxes */}
      <rect x={20} y={40} width={160} height={80} rx={12} fill="oklch(0.6 0.2 264 / 12%)" stroke="oklch(0.6 0.2 264)" strokeWidth={1.5} />
      <text x={100} y={72} textAnchor="middle" className="text-[13px] font-semibold" fill="oklch(0.6 0.2 264)">User Session</text>
      <text x={100} y={92} textAnchor="middle" className="text-[10px]" fill="oklch(0.6 0.2 264 / 70%)">refresh_token</text>

      <rect x={280} y={40} width={160} height={80} rx={12} fill="oklch(0.55 0.25 295 / 12%)" stroke="oklch(0.55 0.25 295)" strokeWidth={1.5} />
      <text x={360} y={72} textAnchor="middle" className="text-[13px] font-semibold" fill="oklch(0.55 0.25 295)">Auth0</text>
      <text x={360} y={92} textAnchor="middle" className="text-[10px]" fill="oklch(0.55 0.25 295 / 70%)">Token Vault</text>

      <rect x={540} y={40} width={160} height={80} rx={12} fill="oklch(0.7 0.18 155 / 12%)" stroke="oklch(0.7 0.18 155)" strokeWidth={1.5} />
      <text x={620} y={72} textAnchor="middle" className="text-[13px] font-semibold" fill="oklch(0.7 0.18 155)">Google API</text>
      <text x={620} y={92} textAnchor="middle" className="text-[10px]" fill="oklch(0.7 0.18 155 / 70%)">scoped access_token</text>

      {/* Arrows */}
      <defs>
        <marker id="tf-arrow" markerWidth={8} markerHeight={6} refX={7} refY={3} orient="auto">
          <path d="M0,0 L8,3 L0,6" fill="none" stroke="oklch(0.65 0 0)" strokeWidth={1.2} />
        </marker>
      </defs>
      <line x1={180} y1={80} x2={275} y2={80} stroke="oklch(0.65 0 0)" strokeWidth={1.5} markerEnd="url(#tf-arrow)" />
      <text x={228} y={72} textAnchor="middle" className="text-[9px]" fill="oklch(0.65 0 0 / 60%)">OBO exchange</text>

      <line x1={440} y1={80} x2={535} y2={80} stroke="oklch(0.65 0 0)" strokeWidth={1.5} markerEnd="url(#tf-arrow)" />
      <text x={488} y={72} textAnchor="middle" className="text-[9px]" fill="oklch(0.65 0 0 / 60%)">scoped token</text>
    </svg>
  );
}

// ── Blog Post ──────────────────────────────────────────────────────

export default function BlogPost() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
      {/* Back link */}
      <Link
        href="/blog"
        className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        &larr; Back to blog
      </Link>

      {/* Header */}
      <header className="mt-6">
        <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
          How We Use Auth0 for AI Agents
        </h1>
        <div className="mt-3 flex items-center gap-3 text-sm text-muted-foreground">
          <time dateTime="2026-04-03">April 3, 2026</time>
          <span aria-hidden="true">&middot;</span>
          <span>6 min read</span>
        </div>
      </header>

      {/* Hackathon callout */}
      <div className="mt-8 rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm">
        <p>
          <strong>Bonus Blog Post Submission</strong> &mdash; Auth0
          &ldquo;Authorized to Act&rdquo; Hackathon 2026
        </p>
      </div>

      {/* Content */}
      <div className="mt-10 space-y-6 text-base leading-relaxed">

        {/* Intro */}
        <p>
          Commerce operations involve real money. When AI agents can change
          pricing, toggle promotions, and send notifications on your behalf,
          the authorization model isn&apos;t a feature. It&apos;s the product.
        </p>
        <p>
          Commerce Changeset is a multi-agent system that reads product data
          from Google Sheets, decomposes natural-language requests into
          discrete operations, evaluates each against a policy engine, gets
          phone-based approval for risky changes, executes writes, and sends
          email receipts. Four agents, one user, zero shared credentials.
        </p>
        <p>
          Auth0&apos;s{" "}
          <a
            href="https://auth0.com/docs/get-started/auth0-for-ai-agents"
            className="underline underline-offset-4 hover:text-foreground"
          >
            AI Agents platform
          </a>{" "}
          has four pillars. We use all of them. Here&apos;s how.
        </p>

        {/* Pillar 1 */}
        <h2 className="mt-10 text-xl font-semibold tracking-tight sm:text-2xl">
          User Authentication
        </h2>
        <p>
          Auth0 Universal Login handles the identity layer. We use{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
            @auth0/nextjs-auth0
          </code>{" "}
          v4 with the middleware pattern, not the legacy route handler. The
          session includes{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
            offline_access
          </code>{" "}
          so we get a refresh token that Token Vault can exchange later.
        </p>
        <p>
          Connected Accounts lets users link their Google account through a
          standard OAuth consent flow. Auth0 stores the federated credential.
          The app never sees it.
        </p>

        {/* Pillar 2 */}
        <h2 className="mt-10 text-xl font-semibold tracking-tight sm:text-2xl">
          Token Vault: How Agents Get API Access
        </h2>
        <p>
          This is the centerpiece. Token Vault brokers short-lived, scoped
          access tokens between our agents and Google&apos;s APIs. The user
          connects their Google account once. Every downstream agent gets
          exactly the permissions its role requires.
        </p>

        <TokenFlowDiagram />

        <p>
          Each agent wraps its tools with{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
            auth0AI.withTokenVault()
          </code>{" "}
          and calls{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
            getAccessTokenFromTokenVault()
          </code>{" "}
          inside the tool execution context. The token exchange happens at
          runtime, not at login. Agents never see the refresh token.
        </p>

        {/* Scope table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 pr-4 font-semibold">Agent</th>
                <th className="pb-2 pr-4 font-semibold">Scope</th>
                <th className="pb-2 font-semibold">What it does</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr>
                <td className="py-2 pr-4 text-blue-600 dark:text-blue-400">Reader</td>
                <td className="py-2 pr-4">
                  <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">spreadsheets.readonly</code>
                </td>
                <td className="py-2 text-muted-foreground">Pulls product data and launch schedules</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-amber-600 dark:text-amber-400">Writer</td>
                <td className="py-2 pr-4">
                  <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">spreadsheets</code>
                </td>
                <td className="py-2 text-muted-foreground">Executes approved price/promo/inventory changes</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-emerald-600 dark:text-emerald-400">Notifier</td>
                <td className="py-2 pr-4">
                  <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">gmail.send</code>
                </td>
                <td className="py-2 text-muted-foreground">Sends execution receipts via Gmail</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          The Orchestrator has no API access at all. It plans, but it
          can&apos;t act. That&apos;s deliberate.
        </p>

        {/* Pillar 3 */}
        <h2 className="mt-10 text-xl font-semibold tracking-tight sm:text-2xl">
          Async Authorization: CIBA + Guardian
        </h2>
        <p>
          Not every operation should execute silently. Our policy engine
          (json-rules-engine, 7 rules) assigns risk tiers to each operation.
          Tier 0 is a read. Tier 1 is a low-risk write. Tier 2+ requires
          explicit approval before the Writer agent touches anything.
        </p>
        <p>
          We use CIBA (Client-Initiated Backchannel Authentication) to send a
          Guardian push notification to the user&apos;s phone. The binding
          message describes what&apos;s about to happen:{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
            Approve: Update price for SKU-1234
          </code>
          . The user taps Approve or Deny. No browser redirect, no popup.
        </p>
        <p>
          This is{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
            auth0AI.withAsyncAuthorization()
          </code>{" "}
          from{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
            @auth0/ai-vercel
          </code>
          . It blocks until the user responds or the timeout expires. In our
          demo, the timeout is 10 seconds. In production, 120.
        </p>

        {/* Pillar 4 */}
        <h2 className="mt-10 text-xl font-semibold tracking-tight sm:text-2xl">
          Stress-Aware Risk Escalation
        </h2>
        <p>
          This is where we go beyond what Auth0 ships today. The platform
          gives us the building blocks. We wire them to a new signal: the
          user&apos;s cognitive state.
        </p>
        <p>
          Commerce Changeset uses Gemini Live for voice input. A sidecar
          model analyzes vocal patterns in real time and classifies the
          user&apos;s emotional state: calm, stressed, rushed, or uncertain.
          When the stress level exceeds 0.7 or the session runs longer than
          60 minutes, the policy engine escalates the risk tier. A Tier 2
          write becomes Tier 3.
        </p>
        <p>
          The approval mechanism is currently the same for both tiers. But
          the classification changes, the UI turns red, and the audit trail
          records why the tier escalated. The infrastructure is ready for
          differentiated enforcement: confirmation phrases, shorter timeouts,
          or dual-approver workflows.
        </p>

        <p>
          An important note on consent: stress and fatigue signals are opt-in,
          assistive, and escalation-only. They never block an operation &mdash;
          they add a confirmation step. Voice-derived signals are ephemeral
          session metadata: no recordings are stored, no biometric profiles are
          built, and no data leaves the session. The user can disable
          voice-aware escalation at any time without affecting their base
          permissions. When no voice context exists, the policy engine evaluates
          operations with standard rules and zero behavioral penalty.
        </p>

        {/* Audit Trail */}
        <h2 className="mt-10 text-xl font-semibold tracking-tight sm:text-2xl">
          The Audit Trail
        </h2>
        <p>
          Every execution produces an{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
            ExecutionReceipt
          </code>{" "}
          with the full OBO delegation chain: which agents acted, what tools
          they were granted, what operations they performed, and how long
          each took. Each agent delegation includes a{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
            tokenExchangeId
          </code>{" "}
          tying it back to the Token Vault exchange. The whole receipt is
          sealed with a SHA-256 audit hash.
        </p>
        <p>
          If something goes wrong, you can trace every decision from the
          user&apos;s request to the API call that executed it.
        </p>

        {/* Architecture Diagram */}
        <h2 className="mt-10 text-xl font-semibold tracking-tight sm:text-2xl">
          Full Pipeline
        </h2>
        <p>
          Here&apos;s the 10-step architecture. Every arrow through the
          Auth0 layer is a Token Vault exchange or a CIBA approval gate.
        </p>

        <div className="mt-4 overflow-x-auto rounded-xl border bg-card p-4">
          <ArchitectureDiagram />
        </div>

        {/* What&apos;s Next */}
        <h2 className="mt-10 text-xl font-semibold tracking-tight sm:text-2xl">
          What&apos;s Next
        </h2>
        <p>
          Differentiated Tier 3 enforcement. Continuous trust scoring that
          modulates agent autonomy in real time, not just binary
          approve/deny. And context boundaries between agents so the Writer
          only sees the operations it&apos;s been approved to execute.
        </p>
        <p>
          For implementation details and the sharp edges we hit along the
          way, see{" "}
          <Link
            href="/blog/building-trust-surfaces-for-ai-agents"
            className="underline underline-offset-4 hover:text-foreground"
          >
            Building Trust Surfaces for AI Agents
          </Link>
          .
        </p>
      </div>
    </article>
  );
}
