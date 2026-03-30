"use client";

import {
  LayoutGridIcon,
  MessageSquareIcon,
  ClockIcon,
  LayersIcon,
  ActivityIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLayout } from "@/components/dashboard/layout-shell";
import { cn } from "@/lib/utils";

const SPINE_ITEMS = [
  { icon: LayoutGridIcon, label: "Workspace", id: "workspace" as const, enabled: true },
  { icon: MessageSquareIcon, label: "Chat", id: "chat" as const, enabled: true },
  { icon: ClockIcon, label: "Timeline", id: "timeline" as const, enabled: false },
  { icon: LayersIcon, label: "Drafts", id: "drafts" as const, enabled: false },
  { icon: ActivityIcon, label: "Activity", id: "activity" as const, enabled: false },
] as const;

type SpineItemId = (typeof SPINE_ITEMS)[number]["id"];

export function ContextSpine() {
  const { activeView, setActiveView } = useLayout();

  const handleSelect = (id: SpineItemId) => {
    if (id === "workspace" || id === "chat") {
      setActiveView(id);
    } else {
      toast.info(`${SPINE_ITEMS.find((i) => i.id === id)?.label} — coming soon`);
    }
  };

  return (
    <nav
      className="hidden w-12 shrink-0 flex-col items-center gap-1 border-r bg-sidebar py-3 md:flex"
      aria-label="Workspace navigation"
    >
      <TooltipProvider>
        {SPINE_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.id === "workspace"
              ? activeView === "workspace"
              : activeView === item.id;

          return (
            <Tooltip key={item.id}>
              <TooltipTrigger
                render={
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    size="icon"
                    className={cn(
                      "min-h-[44px] min-w-[44px]",
                      !item.enabled && "opacity-50",
                    )}
                    onClick={() => handleSelect(item.id)}
                  />
                }
              >
                <Icon className="size-4" />
              </TooltipTrigger>
              <TooltipContent side="right">
                {item.label}
                {!item.enabled && " (coming soon)"}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </TooltipProvider>
    </nav>
  );
}
