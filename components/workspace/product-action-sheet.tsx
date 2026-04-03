"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  PRODUCT_ACTIONS,
  RISK_META,
  interpolatePrompt,
} from "@/lib/actions";
import { useLayout } from "@/components/dashboard/layout-shell";
import type { Product } from "@/components/workspace/workspace-provider";

interface ProductActionSheetProps {
  product: Product | null;
  open: boolean;
  onClose: () => void;
}

export function ProductActionSheet({
  product,
  open,
  onClose,
}: ProductActionSheetProps) {
  const { setPendingPrompt } = useLayout();

  function handleAction(promptTemplate: string) {
    if (!product) return;
    const prompt = interpolatePrompt(promptTemplate, product);
    setPendingPrompt(prompt);
    onClose();
  }

  return (
    <Sheet open={open} onOpenChange={(val) => !val && onClose()}>
      <SheetContent side="bottom" className="max-h-[70vh] pb-safe">
        <SheetHeader>
          {product && (
            <>
              <SheetTitle>{product.name}</SheetTitle>
              <SheetDescription>
                {product.sku} &middot; ${product.price.toFixed(2)}
                {product.promoStatus === "active" && product.promoPrice != null
                  ? ` · Promo $${product.promoPrice.toFixed(2)}`
                  : null}
              </SheetDescription>
            </>
          )}
        </SheetHeader>

        <div className="flex flex-col gap-1 px-4 pb-4">
          {PRODUCT_ACTIONS.map((action) => {
            const Icon = action.icon;
            const risk = RISK_META[action.riskLevel];
            return (
              <button
                key={action.id}
                type="button"
                className="flex items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-accent active:bg-accent/80 min-h-[44px]"
                onClick={() => handleAction(action.promptTemplate)}
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Icon className="size-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight">
                    {action.label}
                  </p>
                  <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                    {action.description}
                  </p>
                </div>
                <div className="flex items-center gap-0.5" aria-label={`Risk: ${risk.label}`}>
                  {Array.from({ length: risk.dots }, (_, i) => (
                    <span
                      key={i}
                      className={cn("size-1.5 rounded-full", risk.color)}
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
