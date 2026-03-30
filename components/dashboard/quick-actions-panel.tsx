"use client";

import { useState, useMemo } from "react";
import { SearchIcon, BookOpenIcon, PenToolIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  ACTIONS,
  CATEGORY_META,
  RISK_META,
  type ActionDefinition,
  type ActionCategory,
  type AgentTag,
  type RiskLevel,
} from "@/lib/actions";
import { useLayout } from "./layout-shell";

// ── Agent tag badge ──────────────────────────────────────────────────

const AGENT_BADGE_CONFIG: Record<
  AgentTag,
  { label: string; className: string }
> = {
  reader: {
    label: "Reader",
    className: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  },
  writer: {
    label: "Writer",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  both: {
    label: "Both",
    className:
      "bg-gradient-to-r from-violet-500/10 to-emerald-500/10 text-foreground",
  },
};

function AgentBadge({ tag }: { tag: AgentTag }) {
  const config = AGENT_BADGE_CONFIG[tag];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
        config.className,
      )}
    >
      {tag === "writer" ? (
        <PenToolIcon aria-hidden="true" className="size-2.5" />
      ) : tag === "both" ? (
        <>
          <BookOpenIcon aria-hidden="true" className="size-2.5" />
          <PenToolIcon aria-hidden="true" className="size-2.5" />
        </>
      ) : (
        <BookOpenIcon aria-hidden="true" className="size-2.5" />
      )}
      {config.label}
    </span>
  );
}

// ── Risk dots ────────────────────────────────────────────────────────

function RiskIndicator({ level }: { level: RiskLevel }) {
  const config = RISK_META[level];
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cn(
              "size-1.5 rounded-full",
              i < config.dots ? config.color : "bg-muted-foreground/20",
            )}
          />
        ))}
      </div>
      <span className="text-[10px] text-muted-foreground">{config.label}</span>
    </div>
  );
}

// ── Agent workflow card ──────────────────────────────────────────────

function AgentWorkflowCard({
  action,
  onSelect,
}: {
  action: ActionDefinition;
  onSelect: (action: ActionDefinition) => void;
}) {
  const Icon = action.icon;

  return (
    <button
      type="button"
      className="agent-card-glow cursor-pointer rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={() => onSelect(action)}
    >
      {/* Inner card — solid bg masks the gradient border except at the 1px edge */}
      <div className="flex h-full min-h-[44px] flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/[0.07] transition-shadow duration-200 hover:shadow-lg hover:shadow-foreground/[0.04]">
        {/* Header */}
        <div className="flex items-start gap-3 p-3 pb-2">
          <div
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg",
              action.iconBg,
            )}
          >
            <Icon className={cn("size-4", action.iconColor)} />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium leading-tight break-words">
                {action.title}
              </span>
              <AgentBadge tag={action.agentTag} />
            </div>
            <span className="text-xs leading-snug text-muted-foreground">
              {action.description}
            </span>
          </div>
        </div>

        <Separator className="mx-3" />

        {/* Workflow steps */}
        <div className="flex flex-col gap-1 px-3 py-2">
          {action.workflowSteps.map((step, i) => (
            <div
              key={i}
              className="workflow-step flex items-center gap-2 text-[11px]"
            >
              <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-muted text-[9px] font-semibold text-muted-foreground">
                {i + 1}
              </span>
              <span className="text-muted-foreground">{step.label}</span>
              {step.agent === "reader" ? (
                <BookOpenIcon aria-hidden="true" className="ml-auto size-2.5 shrink-0 text-violet-500/60" />
              ) : (
                <PenToolIcon aria-hidden="true" className="ml-auto size-2.5 shrink-0 text-emerald-500/60" />
              )}
              <span className="sr-only">{step.agent}</span>
            </div>
          ))}
        </div>

        <Separator className="mx-3" />

        {/* Risk footer */}
        <div className="px-3 py-2">
          <RiskIndicator level={action.riskLevel} />
        </div>
      </div>
    </button>
  );
}

// ── Main panel ───────────────────────────────────────────────────────

export function QuickActionsPanel() {
  const { setPendingAction } = useLayout();
  const [filter, setFilter] = useState("");

  const filtered = useMemo(() => {
    if (!filter.trim()) return ACTIONS;
    const q = filter.trim().toLowerCase();
    return ACTIONS.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.category.includes(q),
    );
  }, [filter]);

  const grouped = useMemo(() => {
    const categoryOrder: ActionCategory[] = [
      "catalog",
      "pricing",
      "promos",
      "inventory",
      "analytics",
      "campaigns",
    ];
    const map = new Map<ActionCategory, ActionDefinition[]>();
    for (const a of filtered) {
      const arr = map.get(a.category) ?? [];
      arr.push(a);
      map.set(a.category, arr);
    }
    return categoryOrder
      .filter((cat) => map.has(cat))
      .map((cat) => ({ category: cat, actions: map.get(cat)! }));
  }, [filtered]);

  const handleSelect = (action: ActionDefinition) => {
    setPendingAction(action);
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Panel header */}
      <div className="border-b px-4 py-3 sm:px-6">
        <h2 className="text-sm font-semibold">Quick Actions</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Agent workflows for common merchant tasks
        </p>
        <div className="relative mt-2">
          <SearchIcon aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Filter actions"
            placeholder="Filter actions..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-8 pl-8 text-base md:text-sm"
          />
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-6 px-4 py-4 pb-safe sm:px-6">
          {grouped.map(({ category, actions }, catIdx) => {
            const meta = CATEGORY_META[category];
            const CatIcon = meta.icon;
            return (
              <section
                key={category}
                aria-labelledby={`${category}-heading`}
                className="animate-category-enter"
                style={{ animationDelay: `${catIdx * 80}ms` }}
              >
                {/* Category header */}
                <div className="glass-subtle mb-3 flex items-center gap-2.5 rounded-lg px-3 py-2">
                  <div
                    className={cn(
                      "flex size-7 items-center justify-center rounded-lg",
                      meta.gradient,
                    )}
                  >
                    <CatIcon aria-hidden="true" className="size-3.5 text-white" />
                  </div>
                  <h3
                    id={`${category}-heading`}
                    className="text-xs font-semibold uppercase tracking-wide"
                  >
                    {meta.label}
                  </h3>
                  <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {actions.length}
                  </span>
                </div>

                {/* Responsive grid */}
                <div className="grid grid-cols-1 gap-3 @[480px]/main:grid-cols-2 @[900px]/main:grid-cols-3">
                  {actions.map((action) => (
                    <AgentWorkflowCard
                      key={action.id}
                      action={action}
                      onSelect={handleSelect}
                    />
                  ))}
                </div>
              </section>
            );
          })}

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <SearchIcon aria-hidden="true" className="mb-2 size-6 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No actions match &ldquo;{filter}&rdquo;
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
