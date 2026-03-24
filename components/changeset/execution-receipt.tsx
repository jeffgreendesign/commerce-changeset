import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type {
  ExecutionReceipt as ReceiptType,
  RiskSummary,
} from "@/lib/changeset/types";
import { AgentBadge } from "./agent-badge";

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
            {receipt.agentDelegations.map((d, i) => (
              <div
                key={i}
                className="rounded-md border border-border/50 p-3 text-xs"
              >
                <div className="mb-1 flex items-center justify-between">
                  <AgentBadge agent={d.agent} />
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
                <p className="text-muted-foreground">
                  Context: {d.contextReceived}
                </p>
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
