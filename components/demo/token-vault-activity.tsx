import { LockKeyholeIcon, Loader2Icon, CheckCircle2Icon } from "lucide-react";
import { AgentBadge } from "@/components/changeset/agent-badge";
import type { PipelinePhase as Phase } from "@/lib/pipeline-phase";

// ── Types ───────────────────────────────────────────────────────────

type EventStatus = "pending" | "running" | "done";

interface TokenEvent {
  agent: string;
  scope: string;
  exchangeId: string;
}

const TOKEN_EVENTS: TokenEvent[] = [
  { agent: "reader", scope: "spreadsheets.readonly", exchangeId: "tv_exch_r1a9" },
  { agent: "writer", scope: "spreadsheets", exchangeId: "tv_exch_w3f7" },
  { agent: "notifier", scope: "gmail.send", exchangeId: "tv_exch_n8c2" },
];

// ── Phase → event status mapping ────────────────────────────────────

function getEventStatus(index: number, phase: Phase): EventStatus {
  // Reader (0): running in loading, done from draft onward
  // Writer (1): running in executing/rolling_back, done in complete
  // Notifier (2): running in complete briefly, shown as done in complete
  if (index === 0) {
    if (phase === "loading") return "running";
    if (phase === "draft" || phase === "executing" || phase === "rolling_back" || phase === "complete") return "done";
    return "pending";
  }
  if (index === 1) {
    if (phase === "executing" || phase === "rolling_back") return "running";
    if (phase === "complete") return "done";
    return "pending";
  }
  if (index === 2) {
    if (phase === "complete") return "done";
    return "pending";
  }
  return "pending";
}

// ── Status indicator ────────────────────────────────────────────────

function StatusIcon({ status }: { status: EventStatus }) {
  if (status === "running") {
    return <Loader2Icon className="size-3 shrink-0 animate-spin text-tv-accent" />;
  }
  if (status === "done") {
    return <CheckCircle2Icon className="size-3 shrink-0 text-emerald-500" />;
  }
  return <div className="size-3 shrink-0 rounded-full border border-muted-foreground/30" />;
}

// ── Component ───────────────────────────────────────────────────────

interface TokenVaultActivityProps {
  phase: Phase;
}

export function TokenVaultActivity({ phase }: TokenVaultActivityProps) {
  if (phase === "idle" || phase === "error" || phase === "denied") return null;

  const visibleEvents = TOKEN_EVENTS.filter((_e, i) => getEventStatus(i, phase) !== "pending");

  if (visibleEvents.length === 0) return null;

  return (
    <div className="animate-step-enter rounded-xl border border-tv-border bg-tv-bg">
      {/* Header */}
      <div className="flex items-center gap-1.5 border-b border-tv-border-subtle px-3 py-1.5">
        <LockKeyholeIcon className="size-3 text-tv-accent" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-tv-accent">
          Token Vault Activity
        </span>
        <span className="text-[10px] text-tv-text-muted">
          google-oauth2
        </span>
      </div>

      {/* Events */}
      <div className="divide-y divide-tv-divide">
        {TOKEN_EVENTS.map((event, i) => {
          const status = getEventStatus(i, phase);
          if (status === "pending") return null;

          return (
            <div
              key={event.agent}
              className="animate-step-enter flex items-center gap-2 px-3 py-1.5"
            >
              <StatusIcon status={status} />
              <AgentBadge agent={event.agent} />
              <span className="text-[11px] text-tv-text">
                OBO &rarr;
              </span>
              <code className="rounded bg-tv-bg-strong px-1 py-0.5 text-[10px] font-mono text-tv-text-strong">
                {event.scope}
              </code>
              <span className="ml-auto text-[10px] font-mono text-tv-text-muted">
                {event.exchangeId}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
