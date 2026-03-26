import type { AgentDelegation } from "@/lib/changeset/types";

export function deriveDelegationStatus(
  d: AgentDelegation,
): "completed" | "failed" | "pending" {
  const hasFailed = d.operationsPerformed.some(
    (op) =>
      op.toLowerCase().includes("fail") || op.toLowerCase().includes("error"),
  );
  if (hasFailed) return "failed";
  if (d.duration > 0 && d.operationsPerformed.length > 0) return "completed";
  return "pending";
}

export const DELEGATION_STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  completed: {
    label: "\u2713 Done",
    className:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  failed: {
    label: "\u2717 Failed",
    className:
      "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
  pending: {
    label: "\u2022 Pending",
    className: "bg-muted text-muted-foreground",
  },
};
