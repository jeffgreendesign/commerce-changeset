import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title:
    "Building Trust Surfaces for AI Agents | Commerce Changeset",
  description:
    "What Token Vault taught us about authorization at the speed of autonomy. A first-person engineering narrative from the Auth0 Authorized to Act hackathon.",
};

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
          Building Trust Surfaces for AI Agents: What Token Vault Taught Us
          About Authorization at the Speed of Autonomy
        </h1>
        <div className="mt-3 flex items-center gap-3 text-sm text-muted-foreground">
          <time dateTime="2026-03-29">March 29, 2026</time>
          <span aria-hidden="true">&middot;</span>
          <span>5 min read</span>
        </div>
      </header>

      {/* Hackathon callout */}
      <div className="mt-8 rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm">
        <p>
          <strong>Bonus Blog Post Submission</strong> &mdash;{" "}
          <a href="https://authorizedtoact.devpost.com/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-foreground">Authorized to Act: Auth0 for AI Agents</a>
        </p>
      </div>

      {/* Content */}
      <div className="mt-10 space-y-6 text-base leading-relaxed">
        {/* Section 1 */}
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
          The Problem We Started With
        </h2>
        <p>
          Commerce operations involve real money. When AI agents can modify
          pricing, toggle promotions, create products, and send notifications on
          behalf of users, the authorization model cannot be an afterthought. We
          built Commerce Changeset to test what happens when you take
          multi-agent orchestration seriously and wire every action through a
          real identity layer.
        </p>
        <p>
          The system has four agents: a Reader that pulls product data from
          Google Sheets, an Orchestrator that decomposes natural language into
          discrete operations, a Writer that executes approved changes, and a
          Notifier that sends email receipts via Gmail. Every agent acts on
          behalf of the authenticated user through Auth0 Token Vault&apos;s
          On-Behalf-Of delegation. The user never hands credentials to an agent
          directly.
        </p>

        {/* Section 2 */}
        <h2 className="mt-10 text-xl font-semibold tracking-tight sm:text-2xl">
          What Token Vault Actually Does (And What Tripped Us Up)
        </h2>
        <p>
          Token Vault&apos;s OBO model is elegant: Auth0 stores the
          user&apos;s Google refresh token, and agents exchange it for scoped
          access tokens at execution time. The user connects their Google
          account once via Connected Accounts, and every downstream agent gets
          exactly the permissions it needs without ever seeing the underlying
          credential.
        </p>
        <p>
          But the implementation had sharp edges. Here is what we found:
        </p>
        <p>
          <strong>Discovery 1: The async context trap.</strong> Token Vault
          tool execution must happen inside the Vercel AI SDK&apos;s tool
          wrapper async context. Calling{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
            getAccessTokenFromTokenVault()
          </code>{" "}
          outside the{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
            withTokenVault()
          </code>{" "}
          callback throws a generic &ldquo;No AI context found&rdquo; error
          with no indication that the fix is wrapping execution inside the
          SDK&apos;s tool context. The error message does not reference Token
          Vault, withTokenVault, or the async context requirement &mdash; you
          have to read the SDK source to connect the dots. This cost us two
          days. The fix was adding{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
            setAIContext()
          </code>{" "}
          at the route level and ensuring all Token Vault calls stay inside the
          withTokenVault callback chain.
        </p>
        <p>
          <strong>Discovery 2: CIBA binding message restrictions.</strong>{" "}
          Binding messages sent to Guardian push notifications are restricted to
          64 characters of alphanumeric text plus basic punctuation (whitespace,
          +, -, _, ., commas, colons, #). No dollar signs, no unicode arrows,
          no emoji. We built a sanitizer to strip forbidden characters from
          dynamic changeset descriptions. This restriction is not documented in
          the SDK reference &mdash; you discover it at runtime when Auth0
          rejects the request.
        </p>
        <p>
          <strong>
            Discovery 3: Connected Accounts requires your own Google OAuth
            credentials.
          </strong>{" "}
          Auth0&apos;s dev keys on the google-oauth2 connection do not support
          Token Vault. You need to register your own Google OAuth app and
          configure the connection with those credentials before Token Vault
          will work. This is a setup sequence dependency that is easy to miss.
        </p>
        <p>
          <strong>
            Discovery 4: Rich Authorization Requests need an enterprise plan.
          </strong>{" "}
          We stubbed the path for CIBA{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
            authorizationDetails
          </code>{" "}
          and built the data structures for per-operation authorization, but the
          Management API rejects authorization_details on client grants without
          enterprise licensing. We built the types and plumbing anyway &mdash;
          the enforcement layer is ready when the plan tier allows it.
        </p>
        <p>
          <strong>
            Discovery 5: Per-agent scope isolation is achievable today.
          </strong>{" "}
          Reader gets{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
            spreadsheets.readonly
          </code>
          , Writer gets{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
            spreadsheets
          </code>{" "}
          (it needs read access for SKU lookup alongside write access for
          mutations), and Notifier gets{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
            gmail.send
          </code>
          . Token Vault enforces the principle of least privilege at the token
          exchange layer &mdash; each agent receives exactly the permissions its
          role requires, and no more.
        </p>

        {/* Section 3 */}
        <h2 className="mt-10 text-xl font-semibold tracking-tight sm:text-2xl">
          Stress-Aware Authorization: A Pattern That Does Not Exist Yet
        </h2>
        <p>
          This is the novel contribution. Our system escalates risk tiers when
          voice signals indicate the user is stressed or fatigued. A
          single-record price change that would normally classify as Tier 2
          (WRITE) gets reclassified to Tier 3 (BULK) if the user&apos;s stress
          level exceeds 0.7 or the session has run longer than 60 minutes. The
          policy engine (json-rules-engine) evaluates these signals alongside
          traditional factors like affected record count and price change
          percentage.
        </p>
        <p>
          An important caveat: in the current implementation, the escalation
          changes the risk classification and UI indicators (amber to red risk
          badge, different policy explanation), but the underlying approval
          mechanism is identical &mdash; both Tier 2 and Tier 3 trigger the
          same CIBA Guardian push notification. Differentiating the actual
          approval experience is the next step. Tier 3 could require a
          confirmation phrase, a shorter approval timeout, dual-approver
          workflows, or a mandatory cool-down period before resubmission. The
          policy engine can already distinguish these tiers &mdash; the
          enforcement layer needs to catch up.
        </p>
        <p>
          Why this matters: current agent authorization is binary. The agent
          either has permission or it does not. But human judgment degrades
          under stress. An authorization system that adapts its approval
          thresholds and friction based on the user&apos;s cognitive state is a
          meaningful evolution of the consent model, even if our implementation
          is a first step.
        </p>

        {/* Consent-first framing */}
        <h3 className="mt-6 text-lg font-semibold tracking-tight">
          Authorization as Cognitive Protection
        </h3>
        <p>
          This feature is not surveillance. The analogy is a seatbelt warning
          light: the system notices strain and adds a speed bump, not a
          roadblock. Stress and fatigue signals are opt-in, assistive, and
          escalation-only &mdash; they feed into the same CIBA confirmation
          flow the user already knows. The user still approves via push
          notification. When no voice context exists, the policy engine
          evaluates the operation exactly as it would without the voice
          interface, with zero behavioral penalty.
        </p>
        <p>
          Privacy is non-negotiable here. Voice-derived signals are ephemeral
          session metadata. No recordings are stored, no biometric profiles are
          built, and no data leaves the session. The user can disable
          voice-aware escalation at any time without affecting their base
          permissions &mdash; the system degrades gracefully to standard tier
          classification. Trust surfaces only work if users trust the surface
          itself.
        </p>

        {/* Section 4 */}
        <h2 className="mt-10 text-xl font-semibold tracking-tight sm:text-2xl">
          What We Would Build Next
        </h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>Differentiated Tier 3 approval:</strong> Confirmation
            phrases, shorter timeouts, or dual-approver flows to make
            escalation meaningful beyond a UI badge change.
          </li>
          <li>
            <strong>Continuous trust scoring:</strong> Real-time modulation of
            agent autonomy rather than binary approve/deny decisions.
          </li>
          <li>
            <strong>Ambient trust visualization:</strong> Active delegations
            and token exchange status shown inline in the agent workflow, not in
            a separate settings page.
          </li>
          <li>
            <strong>Context boundary enforcement:</strong> The orchestrator can
            see everything, but the writer should only see the approved
            operations. Enforcing information boundaries between agents in the
            delegation chain.
          </li>
        </ul>

        {/* Section 5 */}
        <h2 className="mt-10 text-xl font-semibold tracking-tight sm:text-2xl">
          For the Auth0 Team
        </h2>
        <p>
          Direct feedback, framed constructively:
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            The Token Vault + AI SDK async context requirement should be
            documented with a clear &ldquo;wrong way / right way&rdquo; code
            example. The &ldquo;No AI context found&rdquo; error needs to
            reference the{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
              withTokenVault()
            </code>{" "}
            wrapper and{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
              setAIContext()
            </code>{" "}
            as the solution path.
          </li>
          <li>
            CIBA binding message character restrictions should be documented in
            the SDK reference, not discovered at runtime via rejected requests.
          </li>
          <li>
            An Auth0 development-tier RAR option would let hackathon
            participants and early adopters demo fine-grained per-operation
            authorization without enterprise licensing.
          </li>
          <li>
            Consider a &ldquo;dry run&rdquo; mode for Token Vault that
            validates the OAuth flow without actually exchanging tokens &mdash;
            useful for testing and CI pipelines.
          </li>
        </ul>
      </div>
    </article>
  );
}
