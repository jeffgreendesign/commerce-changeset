"use client";

import { useId, useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { PolicyDecision } from "@/lib/policy/types";
import { cn } from "@/lib/utils";
import { TIER_CONFIG } from "@/lib/risk-tier-config";
import { getEscalationExplanation } from "@/lib/policy/escalation-explanation";

export function RiskBadge({
  tier,
  policyExplanation,
}: {
  tier: number;
  policyExplanation?: PolicyDecision;
}) {
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();
  const escalationNote = policyExplanation
    ? getEscalationExplanation(policyExplanation.ruleName)
    : null;
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
            {escalationNote && (
              <>
                <span className="font-medium">Note:</span>
                <span className="italic">{escalationNote}</span>
              </>
            )}
            <span className="font-medium">Scope:</span>
            <span className="font-mono">{policyExplanation.scopeRequested}</span>
          </span>
        </span>
      )}
    </span>
  );
}
