"use client";

import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Operation, ChangeSet } from "@/lib/changeset/types";

// ── Types ────────────────────────────────────────────────────────────

export type InspectableItem =
  | { kind: "operation"; operation: Operation; changeSetId: string }
  | { kind: "changeset"; changeSet: ChangeSet };

interface InspectorProps {
  item: InspectableItem | null;
  onClose: () => void;
}

// ── Detail renderers ─────────────────────────────────────────────────

function OperationDetail({ operation }: { operation: Operation }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium text-muted-foreground">Action</p>
        <p className="text-sm font-semibold">{operation.action}</p>
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground">Target</p>
        <p className="text-sm">{operation.target}</p>
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground">Agent</p>
        <Badge variant="secondary" className="capitalize">
          {operation.agent}
        </Badge>
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground">Risk Tier</p>
        <p className="text-sm">{operation.tier}</p>
      </div>
      {operation.policyExplanation && (
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            Policy
          </p>
          <div className="rounded-md bg-muted/50 p-3 text-xs">
            <p>
              <span className="font-medium">Decision:</span>{" "}
              {operation.policyExplanation.decision}
            </p>
            <p>
              <span className="font-medium">Rule:</span>{" "}
              {operation.policyExplanation.ruleName}
            </p>
            <p>
              <span className="font-medium">Reason:</span>{" "}
              {operation.policyExplanation.reason}
            </p>
          </div>
        </div>
      )}
      {operation.diff.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            Changes
          </p>
          <div className="space-y-2">
            {operation.diff.map((d, i) => (
              <div key={i} className="rounded-md border p-2 text-xs">
                <p className="font-medium">{d.field}</p>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-muted-foreground">Before: </span>
                    <span className="text-red-600 line-through dark:text-red-400">
                      {String(d.before) || "\u2014"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">After: </span>
                    <span className="text-emerald-600 dark:text-emerald-400">
                      {String(d.after)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ChangeSetDetail({ changeSet }: { changeSet: ChangeSet }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium text-muted-foreground">Status</p>
        <Badge variant="secondary" className="capitalize">
          {changeSet.status.replace(/_/g, " ")}
        </Badge>
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground">ID</p>
        <code className="text-xs font-mono">{changeSet.id}</code>
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground">
          Requested By
        </p>
        <p className="text-sm">{changeSet.requestedBy}</p>
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground">Created</p>
        <p className="text-sm">
          {new Date(changeSet.createdAt).toLocaleString()}
        </p>
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground">Operations</p>
        <p className="text-sm">{changeSet.operations.length}</p>
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground">
          Risk Summary
        </p>
        <div className="rounded-md bg-muted/50 p-3 text-xs space-y-1">
          <p>
            Max Tier: <span className="font-medium">{changeSet.riskSummary.maxTier}</span>
          </p>
          <p>
            CIBA Required:{" "}
            <span className="font-medium">
              {changeSet.riskSummary.requiresCIBA ? "Yes" : "No"}
            </span>
          </p>
          <p>
            Auto-approved:{" "}
            <span className="font-medium">
              {changeSet.riskSummary.autonomousOps}
            </span>
          </p>
          <p>
            Approval Required:{" "}
            <span className="font-medium">
              {changeSet.riskSummary.approvalRequiredOps}
            </span>
          </p>
        </div>
      </div>
      {changeSet.execution?.receipt && (
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            Audit Hash
          </p>
          <code className="text-[11px] font-mono break-all">
            {changeSet.execution.receipt.auditHash}
          </code>
        </div>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────

export function Inspector({ item, onClose }: InspectorProps) {
  const title =
    item?.kind === "operation"
      ? `Operation: ${item.operation.action}`
      : item?.kind === "changeset"
        ? "Change Set Details"
        : "Inspector";

  return (
    <>
      {/* Desktop panel — hidden below lg */}
      <aside
        className={cn(
          "hidden overflow-hidden border-l bg-card transition-[width] duration-200 ease-in-out lg:block",
          item ? "w-[380px]" : "w-0",
        )}
      >
        {item && (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h2 className="text-sm font-semibold">{title}</h2>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onClose}
                aria-label="Close inspector"
              >
                <XIcon className="size-4" />
              </Button>
            </div>
            <ScrollArea className="flex-1 p-4">
              {item.kind === "operation" ? (
                <OperationDetail operation={item.operation} />
              ) : (
                <ChangeSetDetail changeSet={item.changeSet} />
              )}
            </ScrollArea>
          </div>
        )}
      </aside>

      {/* Tablet / mobile — bottom sheet (below lg) */}
      <Sheet open={item !== null && typeof window !== "undefined"} onOpenChange={(open) => !open && onClose()}>
        <SheetContent
          side="bottom"
          className="max-h-[80vh] lg:hidden"
          showCloseButton={false}
        >
          <SheetHeader className="flex flex-row items-center justify-between">
            <SheetTitle>{title}</SheetTitle>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              aria-label="Close inspector"
            >
              <XIcon className="size-4" />
            </Button>
          </SheetHeader>
          <ScrollArea className="max-h-[calc(80vh-60px)] p-4">
            {item?.kind === "operation" ? (
              <OperationDetail operation={item.operation} />
            ) : item?.kind === "changeset" ? (
              <ChangeSetDetail changeSet={item.changeSet} />
            ) : null}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}
