import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const AGENT_CONFIG: Record<string, { label: string; className: string }> = {
  reader: {
    label: "Reader",
    className:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  writer: {
    label: "Writer",
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  },
  notifier: {
    label: "Notifier",
    className:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
};

export function AgentBadge({ agent }: { agent: string }) {
  const config = AGENT_CONFIG[agent] ?? {
    label: agent,
    className: "bg-muted text-muted-foreground",
  };

  return (
    <Badge className={cn("border-0", config.className)}>
      {config.label}
    </Badge>
  );
}
