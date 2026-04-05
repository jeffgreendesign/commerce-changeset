import { auth0 } from "@/lib/auth0";
import Link from "next/link";
import { Footer } from "@/components/footer";

const features = [
  {
    label: "Token Vault OBO",
    border: "border-blue-500",
    text: "text-blue-400",
    description:
      "Agents get scoped tokens via On-Behalf-Of delegation. Your credentials never leave Auth0.",
  },
  {
    label: "Risk-Gated Execution",
    border: "border-amber-500",
    text: "text-amber-400",
    description:
      "Four risk tiers. Write ops require CIBA push approval. Bulk ops get escalated friction.",
  },
  {
    label: "Voice-Aware Auth",
    border: "border-emerald-500",
    text: "text-emerald-400",
    description:
      "Gemini Live dual-model voice. Stress signals escalate authorization tier in real time.",
  },
  {
    label: "Auditable Receipts",
    border: "border-accent-teal",
    text: "text-accent-teal",
    description:
      "SHA-256 audit hash over every execution. Full OBO delegation chain. Email notification.",
  },
];

const agents = [
  { name: "Reader", color: "oklch(0.6 0.2 264)", agent: "reader" },
  { name: "Orchestrator", color: "oklch(0.85 0 0)", agent: "orchestrator" },
  { name: "Writer", color: "oklch(0.7 0.18 85)", agent: "writer" },
  { name: "Notifier", color: "oklch(0.7 0.18 155)", agent: "notifier" },
];

const navLinks = [
  { href: "/blog", label: "Blog" },
  { href: "/about", label: "About" },
  { href: "/changelog", label: "Changelog" },
];

export default async function Home() {
  const session = await auth0.getSession();

  return (
    <div className="flex h-dvh flex-col overflow-y-auto bg-[oklch(0.08_0_0)] text-white">
      {/* ── Nav ─────────────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-6 py-4 sm:px-10">
        <span className="font-mono text-xs font-medium tracking-wide">
          Commerce Changeset
        </span>
        <div className="flex items-center gap-5 text-xs text-white/40">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-white/70"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="dot-grid flex flex-1 flex-col items-center justify-center px-6 pb-16 pt-12 sm:pb-24 sm:pt-16">
        <span className="font-mono text-[11px] tracking-[0.25em] text-accent-teal sm:text-xs">
          AUTH0 &middot; AUTHORIZED TO ACT &middot; 2026
        </span>

        <h1 className="mt-6 text-center text-5xl font-bold tracking-tighter sm:text-7xl lg:text-8xl">
          Commerce
          <br />
          Changeset
        </h1>

        <p className="mt-6 max-w-lg text-center font-mono text-sm leading-relaxed text-white/50 sm:text-base">
          Multi-agent commerce operations &mdash; pricing, promotions,
          inventory &mdash; through auditable, authorization-gated AI workflows.
        </p>

        <Link
          href="/demo"
          className="mt-10 inline-flex min-h-[48px] items-center gap-2 rounded-lg bg-accent-teal px-8 py-3.5 text-base font-semibold text-black transition-all hover:brightness-110 active:scale-[0.98] animate-cta-shine"
        >
          Launch Interactive Demo
          <span aria-hidden="true">&rarr;</span>
        </Link>

        {session && (
          <Link
            href="/dashboard"
            className="mt-3 inline-flex min-h-[44px] items-center text-sm text-white/40 underline-offset-4 transition-colors hover:text-white/60 hover:underline"
          >
            Go to Dashboard &rarr;
          </Link>
        )}

        {/* ── Animated Pipeline ──────────────────────────────────── */}
        <div className="mt-16 w-full max-w-2xl sm:mt-20">
          {/* Dots row with connector line behind */}
          <div className="relative flex items-center justify-between px-4 sm:px-8">
            <svg
              className="absolute inset-x-4 top-1/2 -translate-y-1/2 sm:inset-x-8"
              height="2"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <line
                x1="0"
                y1="1"
                x2="100%"
                y2="1"
                className="pipeline-connector"
                stroke="oklch(1 0 0 / 20%)"
                strokeWidth="2"
              />
            </svg>

            {agents.map((a) => (
              <div
                key={a.name}
                className="pipeline-node relative z-10 size-3 rounded-full sm:size-4"
                data-agent={a.agent}
                style={{ backgroundColor: a.color }}
              />
            ))}
          </div>

          {/* Labels row (separate so dots row is perfectly centered for SVG) */}
          <div className="mt-2 flex justify-between px-4 sm:px-8">
            {agents.map((a) => (
              <span
                key={a.name}
                className="text-center font-mono text-[10px] tracking-wider sm:text-xs"
                style={{ color: a.color }}
              >
                {a.name.toUpperCase()}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────── */}
      <section className="border-t border-white/10 px-6 py-20 sm:py-28">
        <div className="mx-auto grid max-w-4xl gap-10 sm:grid-cols-2 sm:gap-8">
          {features.map((f, i) => (
            <div
              key={f.label}
              className={`animate-fade-up border-l-2 ${f.border} pl-4`}
              style={{ animationDelay: `${i * 0.12}s` }}
            >
              <h3
                className={`font-mono text-xs font-medium tracking-wider ${f.text}`}
              >
                {f.label.toUpperCase()}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-white/50">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Second CTA ──────────────────────────────────────────── */}
      <section className="border-t border-white/10 px-6 py-16 text-center">
        <p className="font-mono text-[11px] tracking-[0.2em] text-white/30">
          NO SIGN-UP REQUIRED
        </p>
        <Link
          href="/demo"
          className="mt-5 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-accent-teal underline-offset-4 transition-colors hover:text-white hover:underline"
        >
          Try the Demo &rarr;
        </Link>
        <div className="mt-6 flex items-center justify-center gap-4 text-sm text-white/25">
          <Link
            href="/about"
            className="transition-colors hover:text-white/50"
          >
            How it works
          </Link>
          <span aria-hidden="true">&middot;</span>
          <Link
            href="/blog"
            className="transition-colors hover:text-white/50"
          >
            Blog
          </Link>
          <span aria-hidden="true">&middot;</span>
          <Link
            href="/changelog"
            className="transition-colors hover:text-white/50"
          >
            Changelog
          </Link>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <Footer />
    </div>
  );
}
