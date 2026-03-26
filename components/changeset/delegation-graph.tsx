import { AgentBadge } from "@/components/changeset/agent-badge";
import {
  deriveDelegationStatus,
  DELEGATION_STATUS_CONFIG,
} from "@/components/changeset/delegation-status";
import { Badge } from "@/components/ui/badge";
import { LockIcon } from "lucide-react";
import type { AgentDelegation } from "@/lib/changeset/types";
import { cn } from "@/lib/utils";

// ── Node component ──────────────────────────────────────────────────

function DelegationNode({ delegation }: { delegation: AgentDelegation }) {
  const status = deriveDelegationStatus(delegation);
  const cfg = DELEGATION_STATUS_CONFIG[status];

  return (
    <div className="flex flex-col items-center gap-1.5 rounded-lg border bg-card p-3 shadow-sm min-w-[120px]">
      <AgentBadge agent={delegation.agent} />
      <Badge className={cn("border-0 text-[10px] px-1.5 py-0", cfg.className)}>
        {cfg.label}
      </Badge>
      <span className="text-[10px] tabular-nums text-muted-foreground">
        {delegation.duration.toFixed(0)}ms
      </span>
      <span className="text-[10px] text-muted-foreground">
        {delegation.toolsGranted.length} tool{delegation.toolsGranted.length !== 1 ? "s" : ""}
      </span>
      {delegation.contextReceived && (
        <span className="flex items-center gap-1 rounded border border-dashed border-border/60 px-1.5 py-0.5 text-[9px] text-muted-foreground">
          <LockIcon className="size-2.5 shrink-0" />
          <span className="truncate max-w-[80px]">{delegation.contextReceived}</span>
        </span>
      )}
    </div>
  );
}

// ── SVG connector ───────────────────────────────────────────────────

function HorizontalConnectors({ count }: { count: number }) {
  if (count === 0) return null;

  const width = Math.max(count * 150, 300);
  const centerY = 20;
  const startX = width / 2;

  // Calculate positions for each child node
  const spacing = width / (count + 1);
  const childXs = Array.from({ length: count }, (_, i) => spacing * (i + 1));

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${width} 40`}
      className="mx-auto h-10 max-w-full"
      aria-hidden="true"
    >
      {/* Vertical line from orchestrator */}
      <line
        x1={startX}
        y1={0}
        x2={startX}
        y2={centerY}
        stroke="currentColor"
        strokeWidth={1}
        className="text-border"
      />
      {/* Horizontal spanning line */}
      {count > 1 && (
        <line
          x1={childXs[0]}
          y1={centerY}
          x2={childXs[childXs.length - 1]}
          y2={centerY}
          stroke="currentColor"
          strokeWidth={1}
          className="text-border"
          strokeDasharray="4 2"
          style={{ animation: "connector-flow 1s linear infinite" }}
        />
      )}
      {/* Vertical drops to each child */}
      {childXs.map((x, i) => (
        <line
          key={i}
          x1={x}
          y1={centerY}
          x2={x}
          y2={40}
          stroke="currentColor"
          strokeWidth={1}
          className="text-border"
        />
      ))}
    </svg>
  );
}

// ── Main component ──────────────────────────────────────────────────

export function DelegationGraph({
  delegations,
}: {
  delegations: AgentDelegation[];
}) {
  if (delegations.length === 0) return null;

  return (
    <div>
      <p className="mb-2 text-xs font-medium text-muted-foreground">
        Agent Delegation Flow
      </p>

      {/* Horizontal layout (md+) */}
      <div className="hidden md:block">
        <div className="flex flex-col items-center">
          {/* Orchestrator root node */}
          <div className="rounded-lg border bg-muted/50 px-4 py-2 text-xs font-semibold">
            Orchestrator
          </div>

          {/* SVG connectors */}
          <HorizontalConnectors count={delegations.length} />

          {/* Agent nodes */}
          <div className="flex items-start justify-center gap-4">
            {delegations.map((d) => (
              <DelegationNode key={`${d.agent}-${d.tokenExchangeId}`} delegation={d} />
            ))}
          </div>
        </div>
      </div>

      {/* Vertical layout (< md) */}
      <div className="md:hidden">
        <div className="flex flex-col items-center gap-0">
          <div className="rounded-lg border bg-muted/50 px-4 py-2 text-xs font-semibold">
            Orchestrator
          </div>
          {delegations.map((d, i) => (
            <div key={`${d.agent}-${d.tokenExchangeId}`} className="flex flex-col items-center">
              {/* Vertical connector */}
              <div className="h-4 w-px bg-border" />
              <DelegationNode delegation={d} />
              {i < delegations.length - 1 && (
                <div className="h-2 w-px bg-border" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
