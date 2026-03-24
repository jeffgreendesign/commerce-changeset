"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Operation, ChangeSetStatus } from "@/lib/changeset/types";

interface RollbackSectionProps {
  operations: Operation[];
  changeSetStatus?: ChangeSetStatus;
  isRollback?: boolean;
  onRollback?: () => void;
  isRollingBack?: boolean;
}

export function RollbackSection({
  operations,
  changeSetStatus,
  isRollback,
  onRollback,
  isRollingBack,
}: RollbackSectionProps) {
  const writerOps = operations.filter((op) => op.agent === "writer");
  if (writerOps.length === 0) return null;

  const canRollback =
    onRollback &&
    !isRollback &&
    (changeSetStatus === "completed" || changeSetStatus === "partial_failure");

  return (
    <Card size="sm">
      <Collapsible>
        <CardHeader>
          <CollapsibleTrigger className="flex w-full items-center justify-between text-left">
            <CardTitle>Rollback Instructions</CardTitle>
            <span className="text-xs text-muted-foreground">
              Click to expand
            </span>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-2">
            {writerOps.map((op) => (
              <div
                key={op.id}
                className="rounded-md bg-muted/50 p-2 text-xs font-mono"
              >
                <span className="font-medium">{op.rollback.action}</span>
                <span className="text-muted-foreground">
                  ({JSON.stringify(op.rollback.params)})
                </span>
              </div>
            ))}

            {canRollback && (
              <div className="pt-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={onRollback}
                  disabled={isRollingBack}
                >
                  {isRollingBack ? (
                    <>
                      <span className="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Rolling back&hellip;
                    </>
                  ) : (
                    "Execute Rollback"
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
