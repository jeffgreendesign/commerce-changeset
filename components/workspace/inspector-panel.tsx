"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  XIcon,
  PackageIcon,
  TagIcon,
  BoxIcon,
  ZapIcon,
  ShieldIcon,
  PencilIcon,
  CheckIcon,
  AlertTriangleIcon,
  InfoIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { TIER_CONFIG } from "@/lib/risk-tier-config";
import type { OperationDiff } from "@/lib/changeset/types";
import type { ProactiveIssue } from "@/lib/voice/types";
import { useWorkspace } from "./workspace-provider";

// ── Inspector content ──────────────────────────────────────────────

function InspectorContent({
  onClose,
}: {
  onClose: () => void;
}) {
  const {
    products,
    selectedIds,
    draftChangeset,
    phase,
    submitIntentForProduct,
    deselectAll,
    proactiveIssuesByTarget,
  } = useWorkspace();

  const [editingPrice, setEditingPrice] = useState(false);
  const [priceInput, setPriceInput] = useState("");
  const priceInputRef = useRef<HTMLInputElement>(null);
  const isCommittingRef = useRef(false);

  // Resolve the selected product
  const selectedProduct = useMemo(() => {
    if (selectedIds.size === 0) return null;
    const firstId = selectedIds.values().next().value;
    return products.find((p) => p.id === firstId) ?? null;
  }, [selectedIds, products]);

  // Find all operations targeting this product in draft changeset
  const productOperations = useMemo(() => {
    if (!selectedProduct || !draftChangeset) return [];
    const sku = selectedProduct.sku;
    const id = selectedProduct.id;
    return draftChangeset.operations.filter(
      (op) =>
        op.target === sku ||
        op.target === id ||
        (sku !== "" && op.target.includes(sku)) ||
        (id !== "" && id !== sku && op.target.includes(id)),
    );
  }, [selectedProduct, draftChangeset]);

  // Proactive issues for the selected product
  const productIssues = useMemo<ProactiveIssue[]>(() => {
    if (!selectedProduct) return [];
    return [
      ...(proactiveIssuesByTarget.get(selectedProduct.sku) ?? []),
      ...(selectedProduct.id !== selectedProduct.sku
        ? (proactiveIssuesByTarget.get(selectedProduct.id) ?? [])
        : []),
    ];
  }, [selectedProduct, proactiveIssuesByTarget]);

  // Highest risk tier across all matching operations
  const highestTierOp = useMemo(
    () =>
      productOperations.length > 0
        ? productOperations.reduce((a, b) => (b.tier > a.tier ? b : a))
        : null,
    [productOperations],
  );

  // Flattened diffs from all matching operations
  const allDiffs = useMemo(
    () => productOperations.flatMap((op) => (Array.isArray(op.diff) ? op.diff : [])),
    [productOperations],
  );

  // Start editing price
  const startEditingPrice = useCallback(() => {
    if (!selectedProduct) return;
    setPriceInput(selectedProduct.price.toFixed(2));
    setEditingPrice(true);
  }, [selectedProduct]);

  // Focus input after rendering
  useEffect(() => {
    if (editingPrice && priceInputRef.current) {
      priceInputRef.current.focus();
      priceInputRef.current.select();
    }
  }, [editingPrice]);

  // Submit price change — scoped to the inspected product only.
  // Guarded by isCommittingRef to prevent duplicate calls when blur and
  // confirm-click fire in sequence.
  const commitPriceChange = useCallback(async () => {
    if (!selectedProduct || isCommittingRef.current) return;
    const newPrice = parseFloat(priceInput);
    if (Number.isNaN(newPrice) || newPrice < 0) {
      setEditingPrice(false);
      return;
    }
    if (newPrice === selectedProduct.price) {
      setEditingPrice(false);
      return;
    }
    isCommittingRef.current = true;
    setEditingPrice(false);
    try {
      await submitIntentForProduct(
        `Change price of ${selectedProduct.sku} to $${newPrice.toFixed(2)}`,
        selectedProduct.id,
      );
    } finally {
      isCommittingRef.current = false;
    }
  }, [selectedProduct, priceInput, submitIntentForProduct]);

  const handlePriceKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        commitPriceChange();
      } else if (e.key === "Escape") {
        setEditingPrice(false);
      }
    },
    [commitPriceChange],
  );

  const handleClose = useCallback(() => {
    deselectAll();
    onClose();
  }, [deselectAll, onClose]);

  if (!selectedProduct) return null;

  const isBusy = phase === "preview" || phase === "executing";

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold truncate pr-2">
          {selectedProduct.name}
        </h2>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleClose}
          aria-label="Close inspector"
        >
          <XIcon className="size-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-4 p-4">
          {/* SKU + Category */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <PackageIcon className="size-3.5" />
            <span className="font-mono">{selectedProduct.sku}</span>
            <span>&middot;</span>
            <span className="capitalize">{selectedProduct.category}</span>
          </div>

          <Separator />

          {/* Price section */}
          <div>
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Price</p>
              {!editingPrice && !isBusy && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={startEditingPrice}
                  aria-label="Edit price"
                >
                  <PencilIcon className="size-3" />
                </Button>
              )}
            </div>
            {editingPrice ? (
              <div className="mt-1 flex items-center gap-2">
                <span className="text-lg font-bold">$</span>
                <input
                  ref={priceInputRef}
                  type="number"
                  step="0.01"
                  min="0"
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  onKeyDown={handlePriceKeyDown}
                  onBlur={() => commitPriceChange()}
                  className="w-full rounded-md border bg-background px-2 py-1 text-base font-bold tabular-nums md:text-sm"
                />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => commitPriceChange()}
                  aria-label="Confirm price"
                >
                  <CheckIcon className="size-4" />
                </Button>
              </div>
            ) : (
              <p className="text-2xl font-bold tracking-tight">
                ${selectedProduct.price.toFixed(2)}
              </p>
            )}
          </div>

          <Separator />

          {/* Inventory */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BoxIcon className="size-3.5 text-muted-foreground" />
              <p className="text-xs font-medium text-muted-foreground">
                Inventory
              </p>
            </div>
            <p className="text-sm font-semibold tabular-nums">
              {selectedProduct.inventory.toLocaleString()} units
            </p>
          </div>

          {/* Promo status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ZapIcon className="size-3.5 text-muted-foreground" />
              <p className="text-xs font-medium text-muted-foreground">
                Promo Status
              </p>
            </div>
            <Badge
              variant={
                selectedProduct.promoStatus === "active"
                  ? "default"
                  : "secondary"
              }
              className="text-[10px]"
            >
              {selectedProduct.promoStatus === "active" ? "Active" : "Inactive"}
            </Badge>
          </div>

          <Separator />

          {/* Risk Analysis */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ShieldIcon className="size-3.5 text-muted-foreground" />
              <p className="text-xs font-medium text-muted-foreground">
                Risk Analysis
              </p>
            </div>
            {highestTierOp ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs">Tier:</span>
                  {(() => {
                    const cfg = TIER_CONFIG[highestTierOp.tier] ?? {
                      label: `Tier ${highestTierOp.tier}`,
                      className: "bg-muted text-muted-foreground",
                    };
                    return (
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                          cfg.className,
                        )}
                      >
                        {cfg.label}
                      </span>
                    );
                  })()}
                  {productOperations.length > 1 && (
                    <span className="text-[10px] text-muted-foreground">
                      ({productOperations.length} ops)
                    </span>
                  )}
                </div>
                {highestTierOp.policyExplanation && (
                  <div className="rounded-md bg-muted/50 p-2 text-[11px] space-y-0.5">
                    <p>
                      <span className="font-medium">Decision:</span>{" "}
                      {highestTierOp.policyExplanation.decision}
                    </p>
                    <p>
                      <span className="font-medium">Rule:</span>{" "}
                      {highestTierOp.policyExplanation.ruleName}
                    </p>
                    <p>
                      <span className="font-medium">Reason:</span>{" "}
                      {highestTierOp.policyExplanation.reason}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No pending changes
              </p>
            )}
          </div>

          {/* Proactive alerts for this product */}
          {productIssues.length > 0 && (
            <>
              <Separator />
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangleIcon className="size-3.5 text-amber-500" />
                  <p className="text-xs font-medium text-muted-foreground">
                    Proactive Alerts
                  </p>
                </div>
                <div className="space-y-1.5">
                  {productIssues.map((issue, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex items-start gap-2 rounded-md p-2 text-[11px] leading-snug",
                        issue.severity === "error"
                          ? "bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-300"
                          : issue.severity === "warning"
                            ? "bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
                            : "bg-blue-50 text-blue-800 dark:bg-blue-950/30 dark:text-blue-300",
                      )}
                    >
                      {issue.severity === "info" ? (
                        <InfoIcon className="mt-0.5 size-3 shrink-0" />
                      ) : (
                        <AlertTriangleIcon className="mt-0.5 size-3 shrink-0" />
                      )}
                      <span>{issue.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Pending diffs (flattened from all matching operations) */}
          {allDiffs.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Pending Changes
                </p>
                <div className="space-y-1.5">
                  {allDiffs.map((d: OperationDiff, i: number) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-md border px-2 py-1.5 text-xs"
                    >
                      <span className="font-medium">{d.field}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-red-600 line-through dark:text-red-400">
                          {String(d.before)}
                        </span>
                        <TagIcon className="size-3 text-muted-foreground" />
                        <span className="text-emerald-600 dark:text-emerald-400">
                          {String(d.after)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Multi-selection info */}
          {selectedIds.size > 1 && (
            <>
              <Separator />
              <p className="text-xs text-muted-foreground">
                {selectedIds.size} products selected. Showing first product.
              </p>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────

export function InspectorPanel() {
  const { selectedIds, deselectAll } = useWorkspace();
  const isOpen = selectedIds.size > 0;

  const handleClose = useCallback(() => {
    deselectAll();
  }, [deselectAll]);

  return (
    <>
      {/* Desktop panel — hidden below lg */}
      <aside
        className={cn(
          "inspector-panel hidden overflow-hidden border-l bg-card transition-[width] duration-200 ease-in-out lg:block",
          isOpen ? "w-[320px]" : "w-0",
        )}
      >
        {isOpen && <InspectorContent onClose={handleClose} />}
      </aside>

      {/* Mobile — bottom sheet */}
      <Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <SheetContent
          side="bottom"
          className="max-h-[80vh] lg:hidden"
          showCloseButton={false}
        >
          <SheetHeader className="flex flex-row items-center justify-between">
            <SheetTitle>Product Inspector</SheetTitle>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleClose}
              aria-label="Close inspector"
            >
              <XIcon className="size-4" />
            </Button>
          </SheetHeader>
          {isOpen && <InspectorContent onClose={handleClose} />}
        </SheetContent>
      </Sheet>
    </>
  );
}
