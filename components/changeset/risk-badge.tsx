"use client";

import { useId, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { RiskTier } from "@/lib/policy/types";
import type { PolicyDecision } from "@/lib/policy/types";
import { cn } from "@/lib/utils";

const TIER_CONFIG: Record<number, { label: string; className: string }> = {
  [RiskTier.READ]: {
    label: "Read",
    className:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  [RiskTier.NOTIFY]: {
    label: "Notify",
    className:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  [RiskTier.WRITE]: {
    label: "Write",
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  },
  [RiskTier.BULK]: {
    label: "Bulk",
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
};

export function RiskBadge({
  tier,
  policyExplanation,
}: {
  tier: number;
  policyExplanation?: PolicyDecision;
}) {
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();
  const config = TIER_CONFIG[tier] ?? {
    label: `Tier ${tier}`,
    className: "bg-muted text-muted-foreground",
  };

  const badge = (
    <Badge className={cn("border-0", config.className)}>
      Tier {tier} &middot; {config.label}
    </Badge>
  );

  if (!policyExplanation) {
    return badge;
  }

  return (
    <span className="inline-flex flex-col items-start">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="cursor-pointer"
        aria-expanded={expanded}
        aria-controls={panelId}
        aria-label="Toggle risk details"
      >
        {badge}
      </button>
      {expanded && (
        <span id={panelId} className="mt-1 rounded-md border border-border/50 bg-muted/50 p-2 text-xs text-muted-foreground">
          <span className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5">
            <span className="font-medium">Decision:</span>
            <span>{policyExplanation.decision}</span>
            <span className="font-medium">Rule:</span>
            <span>{policyExplanation.ruleName}</span>
            <span className="font-medium">Reason:</span>
            <span>{policyExplanation.reason}</span>
            <span className="font-medium">Scope:</span>
            <span className="font-mono">{policyExplanation.scopeRequested}</span>
          </span>
        </span>
      )}
    </span>
  );
}
