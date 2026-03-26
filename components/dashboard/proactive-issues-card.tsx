"use client";

import {
  AlertTriangleIcon,
  InfoIcon,
  AlertCircleIcon,
  WrenchIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ProactiveIssue } from "@/lib/voice/types";

// ── Types ────────────────────────────────────────────────────────────

interface ProactiveIssuesCardProps {
  issues: ProactiveIssue[];
  /** Called when user accepts a suggested fix. */
  onApplyFix?: (issue: ProactiveIssue) => void;
  disabled?: boolean;
}

// ── Severity styling ─────────────────────────────────────────────────

function getSeverityIcon(severity: ProactiveIssue["severity"]) {
  switch (severity) {
    case "error":
      return <AlertCircleIcon className="size-4 text-red-600 dark:text-red-400" />;
    case "warning":
      return <AlertTriangleIcon className="size-4 text-amber-600 dark:text-amber-400" />;
    case "info":
      return <InfoIcon className="size-4 text-blue-600 dark:text-blue-400" />;
  }
}

function getSeverityBorder(severity: ProactiveIssue["severity"]) {
  switch (severity) {
    case "error":
      return "border-red-200 dark:border-red-900/50";
    case "warning":
      return "border-amber-200 dark:border-amber-900/50";
    case "info":
      return "border-blue-200 dark:border-blue-900/50";
  }
}

// ── Component ────────────────────────────────────────────────────────

export function ProactiveIssuesCard({
  issues,
  onApplyFix,
  disabled = false,
}: ProactiveIssuesCardProps) {
  if (issues.length === 0) return null;

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;
  const infoCount = issues.filter((i) => i.severity === "info").length;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <AlertTriangleIcon className="size-4 text-amber-600 dark:text-amber-400" />
        <h3 className="text-sm font-semibold">
          Proactive Checks ({issues.length})
        </h3>
        <div className="flex gap-1.5 text-[10px] text-muted-foreground">
          {errorCount > 0 && (
            <span className="text-red-600 dark:text-red-400">{errorCount} error{errorCount !== 1 ? "s" : ""}</span>
          )}
          {warningCount > 0 && (
            <span className="text-amber-600 dark:text-amber-400">{warningCount} warning{warningCount !== 1 ? "s" : ""}</span>
          )}
          {infoCount > 0 && (
            <span className="text-blue-600 dark:text-blue-400">{infoCount} info</span>
          )}
        </div>
      </div>

      {/* Issues list */}
      <div className="space-y-2">
        {issues.map((issue, i) => (
          <div
            key={`${issue.operationId}-${i}`}
            className={cn(
              "flex items-start gap-2.5 rounded-md border bg-card p-2.5",
              getSeverityBorder(issue.severity)
            )}
          >
            <div className="mt-0.5 shrink-0">
              {getSeverityIcon(issue.severity)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs leading-relaxed text-foreground">
                {issue.description}
              </p>
              {issue.suggestedFix && onApplyFix && (
                <Button
                  variant="outline"
                  size="xs"
                  className="mt-1.5"
                  onClick={() => onApplyFix(issue)}
                  disabled={disabled}
                >
                  <WrenchIcon className="size-3" />
                  Apply fix: {issue.suggestedFix.field} → ${String(issue.suggestedFix.suggestedValue)}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
