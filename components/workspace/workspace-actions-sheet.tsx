"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { BULK_ACTIONS, RISK_META, CATEGORY_META } from "@/lib/actions";
import { useLayout } from "@/components/dashboard/layout-shell";

interface WorkspaceActionsSheetProps {
  open: boolean;
  onClose: () => void;
  selectedCount: number;
}

export function WorkspaceActionsSheet({
  open,
  onClose,
  selectedCount,
}: WorkspaceActionsSheetProps) {
  const { setPendingPrompt } = useLayout();

  function handleAction(prompt: string) {
    setPendingPrompt(prompt);
    onClose();
  }

  return (
    <Sheet open={open} onOpenChange={(val) => !val && onClose()}>
      <SheetContent side="bottom" className="max-h-[80vh] pb-safe">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Quick Actions
            {selectedCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {selectedCount} selected
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            {selectedCount > 0
              ? "Bulk actions will apply to selected products"
              : "Global actions across your catalog"}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-1 px-4 pb-4 overflow-y-auto">
          {BULK_ACTIONS.map((action) => {
            const Icon = action.icon;
            const risk = RISK_META[action.riskLevel];
            const cat = CATEGORY_META[action.category];
            return (
              <button
                key={action.id}
                type="button"
                className="flex items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-accent active:bg-accent/80 min-h-[44px]"
                onClick={() => handleAction(action.prompt)}
              >
                <div
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg",
                    cat.gradient,
                  )}
                >
                  <Icon className="size-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium leading-tight">
                      {action.title}
                    </p>
                    {action.agentTag === "reader" && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        Read-only
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                    {action.description}
                  </p>
                </div>
                <div
                  className="flex items-center gap-0.5"
                  aria-label={`Risk: ${risk.label}`}
                >
                  {Array.from({ length: risk.dots }, (_, i) => (
                    <span
                      key={i}
                      className={cn("size-1.5 rounded-full animate-dot-pulse", risk.color)}
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
