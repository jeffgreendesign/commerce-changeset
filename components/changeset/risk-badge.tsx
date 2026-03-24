import { Badge } from "@/components/ui/badge";
import { RiskTier } from "@/lib/policy/types";
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

export function RiskBadge({ tier }: { tier: number }) {
  const config = TIER_CONFIG[tier] ?? {
    label: `Tier ${tier}`,
    className: "bg-muted text-muted-foreground",
  };

  return (
    <Badge className={cn("border-0", config.className)}>
      Tier {tier} &middot; {config.label}
    </Badge>
  );
}
