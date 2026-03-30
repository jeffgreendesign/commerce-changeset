"use client";

import { BookOpenIcon, PenToolIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RISK_META, type ActionDefinition } from "@/lib/actions";

// ── Component ───────────────────────────────────────────────────────

interface QuickActionConfirmDialogProps {
  action: ActionDefinition | null;
  onConfirm: (action: ActionDefinition) => void;
  onCancel: () => void;
}

export function QuickActionConfirmDialog({
  action,
  onConfirm,
  onCancel,
}: QuickActionConfirmDialogProps) {
  if (!action) return null;

  const Icon = action.icon;
  const risk = RISK_META[action.riskLevel];

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-lg",
                action.iconBg,
              )}
            >
              <Icon className={cn("size-5", action.iconColor)} />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle>{action.title}</DialogTitle>
              <DialogDescription className="mt-0.5">
                {action.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Workflow steps */}
        <div className="flex flex-col gap-1.5 rounded-lg bg-muted/50 px-3 py-2.5">
          {action.workflowSteps.map((step, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-background text-[10px] font-semibold text-muted-foreground ring-1 ring-foreground/10">
                {i + 1}
              </span>
              <span className="text-foreground">{step.label}</span>
              {step.agent === "reader" ? (
                <BookOpenIcon
                  aria-hidden="true"
                  className="ml-auto size-3 shrink-0 text-violet-500/60"
                />
              ) : (
                <PenToolIcon
                  aria-hidden="true"
                  className="ml-auto size-3 shrink-0 text-emerald-500/60"
                />
              )}
            </div>
          ))}
        </div>

        {/* Risk + prompt preview */}
        <div className="flex items-center gap-1.5">
          <div className="flex gap-0.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={cn(
                  "size-1.5 rounded-full",
                  i < risk.dots ? risk.color : "bg-muted-foreground/20",
                )}
              />
            ))}
          </div>
          <span className="text-[11px] text-muted-foreground">
            {risk.label}
          </span>
        </div>

        <blockquote className="rounded-md border-l-2 border-foreground/10 bg-muted/30 px-3 py-2 text-xs italic text-muted-foreground">
          &ldquo;{action.prompt}&rdquo;
        </blockquote>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={() => onConfirm(action)}>Run Action</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
