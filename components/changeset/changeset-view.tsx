import { Badge } from "@/components/ui/badge";
import type { ChangeSet } from "@/lib/changeset/types";
import { OperationCard } from "./operation-card";
import { RiskSummary } from "./risk-summary";
import { ExecutionReceipt } from "./execution-receipt";
import { RollbackSection } from "./rollback-section";

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending_approval:
    "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
  approved:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  executing:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  completed:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  partial_failure:
    "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  expired: "bg-muted text-muted-foreground",
  rolled_back: "bg-muted text-muted-foreground",
};

interface ChangeSetViewProps {
  changeSet: ChangeSet;
  onRollback?: () => void;
  isRollingBack?: boolean;
}

export function ChangeSetView({
  changeSet,
  onRollback,
  isRollingBack,
}: ChangeSetViewProps) {
  const execution = changeSet.execution;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h3 className="text-lg font-semibold tracking-tight">Change Set</h3>
        <Badge
          className={`border-0 ${STATUS_STYLE[changeSet.status] ?? "bg-muted text-muted-foreground"}`}
        >
          {changeSet.status.replace(/_/g, " ")}
        </Badge>
      </div>

      <div className="flex gap-4 text-xs text-muted-foreground">
        <span>
          ID: <code className="font-mono">{changeSet.id.slice(0, 8)}</code>
        </span>
        <span>Requested by: {changeSet.requestedBy}</span>
        <span>{new Date(changeSet.createdAt).toLocaleString()}</span>
      </div>

      {/* Risk summary */}
      <RiskSummary summary={changeSet.riskSummary} />

      {/* Operations */}
      <div className="space-y-3">
        {changeSet.operations.map((op) => {
          const result = execution?.results.find(
            (r) => r.operationId === op.id
          );
          const checks = execution?.receipt.verification.results.filter(
            (c) => c.operationId === op.id
          );
          return (
            <OperationCard
              key={op.id}
              operation={op}
              result={result}
              checks={checks}
            />
          );
        })}
      </div>

      {/* Rollback */}
      <RollbackSection
        operations={changeSet.operations}
        changeSetStatus={changeSet.status}
        isRollback={!!changeSet.rollbackOf}
        onRollback={onRollback}
        isRollingBack={isRollingBack}
      />

      {/* Execution receipt */}
      {execution?.receipt && (
        <ExecutionReceipt receipt={execution.receipt} summary={changeSet.riskSummary} />
      )}
    </div>
  );
}
