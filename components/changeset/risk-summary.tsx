import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RiskSummary as RiskSummaryType } from "@/lib/changeset/types";
import { RiskBadge } from "./risk-badge";

export function RiskSummary({ summary }: { summary: RiskSummaryType }) {
  const totalOps = summary.autonomousOps + summary.approvalRequiredOps;

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Risk Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {totalOps} operation{totalOps !== 1 ? "s" : ""}
          </span>

          {Object.entries(summary.operationsByTier).map(([tier, count]) => (
            <span key={tier} className="flex items-center gap-1">
              <RiskBadge tier={Number(tier)} />
              <span className="text-xs text-muted-foreground">&times;{count}</span>
            </span>
          ))}

          {summary.requiresCIBA && (
            <Badge className="border-0 bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400">
              CIBA Required
            </Badge>
          )}

          <Badge className="border-0 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
            &#10003; {summary.autonomousOps} auto-approved
          </Badge>

          {summary.approvalRequiredOps > 0 && (
            <Badge className="border-0 bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400">
              {summary.approvalRequiredOps} require approval
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
