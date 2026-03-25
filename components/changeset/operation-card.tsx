import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  Operation,
  OperationResult,
  VerificationCheck,
} from "@/lib/changeset/types";
import type { PolicyDecision } from "@/lib/policy/types";
import { AgentBadge } from "./agent-badge";
import { RiskBadge } from "./risk-badge";
import { DiffView } from "./diff-view";

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "success":
      return (
        <Badge className="border-0 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
          Success
        </Badge>
      );
    case "failure":
      return (
        <Badge className="border-0 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
          Failed
        </Badge>
      );
    case "skipped":
      return (
        <Badge className="border-0 bg-muted text-muted-foreground">
          Skipped
        </Badge>
      );
    default:
      return null;
  }
}

function AutonomyBadge({ decision }: { decision: PolicyDecision["decision"] }) {
  if (decision === "auto-approve") {
    return (
      <Badge className="border-0 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
        Auto
      </Badge>
    );
  }
  return (
    <Badge className="border-0 bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400">
      CIBA
    </Badge>
  );
}

function ToolCallChip({ action, duration }: { action: string; duration: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded border border-dashed border-border/60 px-2 py-0.5 text-xs text-muted-foreground">
      <svg className="h-3 w-3 shrink-0" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path d="M4.708 5.578L2.061 8.224l2.647 2.646-.708.708L.94 8.224 4 5.164l.708.414zm6.584 0l2.647 2.646-2.647 2.646.708.708L15.06 8.224 12 5.164l-.708.414zM6.854 13.146l2-10 .98.196-2 10-.98-.196z" />
      </svg>
      <code className="font-mono">{action}</code>
      <span>&middot;</span>
      <span>{duration.toFixed(0)}ms</span>
    </span>
  );
}

function VerificationBadge({ status }: { status: string }) {
  if (status === "pass") {
    return (
      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
        Pass
      </span>
    );
  }
  if (status === "fail") {
    return (
      <span className="text-xs font-medium text-red-600 dark:text-red-400">
        Fail
      </span>
    );
  }
  return (
    <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
      Warning
    </span>
  );
}

export function OperationCard({
  operation,
  result,
  checks,
}: {
  operation: Operation;
  result?: OperationResult;
  checks?: VerificationCheck[];
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AgentBadge agent={operation.agent} />
          <span className="font-mono text-sm">{operation.action}</span>
          <span className="text-muted-foreground">&rarr;</span>
          <span className="text-sm">{operation.target}</span>
          <RiskBadge tier={operation.tier} policyExplanation={operation.policyExplanation} />
          <AutonomyBadge decision={operation.policyExplanation.decision} />
          {result && <StatusBadge status={result.status} />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {result && (
          <ToolCallChip action={operation.action} duration={result.duration} />
        )}
        <DiffView diffs={operation.diff} />

        {result?.error && (
          <p className="text-xs text-red-600 dark:text-red-400">
            Error: {result.error}
          </p>
        )}

        {checks && checks.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              Verification
            </p>
            {checks.map((check, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <VerificationBadge status={check.status} />
                <span className="text-muted-foreground">{check.field}:</span>
                <span>
                  expected {String(check.expected)}, got {String(check.actual)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
