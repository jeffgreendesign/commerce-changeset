"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Operation } from "@/lib/changeset/types";

export function RollbackSection({ operations }: { operations: Operation[] }) {
  const writerOps = operations.filter((op) => op.agent === "writer");
  if (writerOps.length === 0) return null;

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
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
