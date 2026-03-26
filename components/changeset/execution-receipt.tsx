import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type {
  AgentDelegation,
  ExecutionReceipt as ReceiptType,
  RiskSummary,
} from "@/lib/changeset/types";
import { cn } from "@/lib/utils";
import { AgentBadge } from "./agent-badge";
import { DelegationGraph } from "./delegation-graph";

// ── Shared icons ────────────────────────────────────────────────────

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("h-3 w-3 shrink-0", className)} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M4 7V5a4 4 0 118 0v2h1a1 1 0 011 1v6a1 1 0 01-1 1H3a1 1 0 01-1-1V8a1 1 0 011-1h1zm2 0h4V5a2 2 0 10-4 0v2z" />
    </svg>
  );
}

// ── Status helpers ──────────────────────────────────────────────────

function deriveDelegationStatus(d: AgentDelegation): "completed" | "failed" | "pending" {
  const hasFailed = d.operationsPerformed.some(
    (op) => op.toLowerCase().includes("fail") || op.toLowerCase().includes("error"),
  );
  if (hasFailed) return "failed";
  if (d.duration > 0 && d.operationsPerformed.length > 0) return "completed";
  return "pending";
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  completed: {
    label: "\u2713 Completed",
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  failed: {
    label: "\u2717 Failed",
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
  pending: {
    label: "\u2022 Pending",
    className: "bg-muted text-muted-foreground",
  },
};

// ── Main component ──────────────────────────────────────────────────

export function ExecutionReceipt({
  receipt,
  summary,
}: {
  receipt: ReceiptType;
  summary?: RiskSummary;
}) {
  const checksTotal = receipt.verification.checksRun;
  const checksPassed = receipt.verification.checksPassed;
  const allPassed = checksPassed === checksTotal;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Execution Receipt</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Delegation Graph */}
        {receipt.agentDelegations.length > 0 && (
          <>
            <DelegationGraph delegations={receipt.agentDelegations} />
            <Separator />
          </>
        )}

        {/* OBO Chain */}
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            OBO Delegation Chain
          </p>
          <div className="flex items-center gap-1.5 text-sm">
            <span className="font-medium">{receipt.oboChain.user}</span>
            {receipt.oboChain.delegatedTo.map((agent) => (
              <span key={agent} className="flex items-center gap-1.5">
                <span className="text-muted-foreground">&rarr;</span>
                <AgentBadge agent={agent} />
              </span>
            ))}
          </div>
        </div>

        <Separator />

        {/* Agent Delegations */}
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Agent Delegations
          </p>
          <div className="space-y-3">
            {receipt.agentDelegations.map((d) => (
              <div
                key={`${d.agent}-${d.tokenExchangeId}`}
                className="rounded-md border border-border/50 p-3 text-xs"
              >
                <div className="mb-1 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <AgentBadge agent={d.agent} />
                    {(() => {
                      const status = deriveDelegationStatus(d);
                      const cfg = STATUS_CONFIG[status];
                      return (
                        <Badge className={`border-0 text-[10px] px-1.5 py-0 ${cfg.className}`}>
                          {cfg.label}
                        </Badge>
                      );
                    })()}
                  </div>
                  <span className="text-muted-foreground">
                    {d.duration.toFixed(0)}ms
                  </span>
                </div>
                <p className="text-muted-foreground">
                  Acting on behalf of: {d.actingOnBehalfOf}
                </p>
                <p className="text-muted-foreground">
                  Tools: {d.toolsGranted.join(", ")}
                </p>
                <div className="mt-1 flex items-center gap-1.5 rounded border border-dashed border-border/80 px-2 py-1 text-muted-foreground">
                  <LockIcon />
                  <span>Scoped: {d.contextReceived}</span>
                </div>
                <p className="text-muted-foreground">
                  Operations: {d.operationsPerformed.join(", ")}
                </p>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Verification */}
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            Verification
          </p>
          <Badge
            className={`border-0 ${
              allPassed
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
            }`}
          >
            {checksPassed}/{checksTotal} checks passed
          </Badge>
        </div>

        {/* Autonomy Breakdown */}
        {summary && (
          <>
            <Separator />
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                Autonomy Breakdown
              </p>
              <p className="text-xs text-muted-foreground">
                {summary.autonomousOps} of{" "}
                {summary.autonomousOps + summary.approvalRequiredOps} operations
                executed autonomously
              </p>
            </div>
          </>
        )}

        <Separator />

        {/* Audit */}
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>
            Executed by: <span className="font-medium">{receipt.executedBy}</span>
          </p>
          <p>Executed at: {receipt.executedAt}</p>
          <p className="font-mono text-[11px] break-all">
            Audit: {receipt.auditHash}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
