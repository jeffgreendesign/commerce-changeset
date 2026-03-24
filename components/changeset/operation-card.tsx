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
          <span className="font-mono text-sm">{operation.action}</span>
          <span className="text-muted-foreground">&rarr;</span>
          <span className="text-sm">{operation.target}</span>
          <RiskBadge tier={operation.tier} />
          {result && <StatusBadge status={result.status} />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium">{operation.policyExplanation.ruleName}:</span>{" "}
          {operation.policyExplanation.reason}
        </p>

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
