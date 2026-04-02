"use client";

import { useMemo, useCallback, useState } from "react";
import { ZapIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "./workspace-provider";
import { ProductTile, type TileClickModifiers } from "./product-tile";
import { AmbientLayer } from "./ambient-layer";
import { ProductActionSheet } from "./product-action-sheet";
import { WorkspaceActionsSheet } from "./workspace-actions-sheet";
import { ActionHint } from "./action-hint";
import type { Product } from "./workspace-provider";
import type { Operation } from "@/lib/changeset/types";

export function LivingSurface() {
  const {
    products,
    loading,
    fetchError,
    selectedIds,
    select,
    multiSelect,
    deselectAll,
    phase,
    wsTemperature,
    wsEnergy,
    proactiveIssuesByTarget,
    retryFetch,
    draftChangeset,
  } = useWorkspace();

  // Group products by category
  const grouped = useMemo(() => {
    const map = new Map<string, typeof products>();
    for (const product of products) {
      const category = product.category || "uncategorized";
      const existing = map.get(category);
      if (existing) {
        existing.push(product);
      } else {
        map.set(category, [product]);
      }
    }
    return map;
  }, [products]);

  // Build operation lookup: target (SKU) → Operation
  // Orchestrator targets include the product name (e.g. "STR-001 Classic Runner"),
  // so we also key by extracted SKU prefix to match product.sku ("STR-001").
  const operationsByTarget = useMemo(() => {
    if (!draftChangeset) return new Map<string, Operation>();
    const map = new Map<string, Operation>();
    for (const op of draftChangeset.operations) {
      if (typeof op.target === "string") {
        map.set(op.target, op);
        const skuMatch = op.target.match(/^([A-Z]{2,}-\d{3,})/);
        if (skuMatch) map.set(skuMatch[1], op);
      }
    }
    return map;
  }, [draftChangeset]);

  // ── Action sheet state ───────────────────────────────────────────
  const [actionProduct, setActionProduct] = useState<Product | null>(null);
  const [fabSheetOpen, setFabSheetOpen] = useState(false);
  const [hintDismissed, setHintDismissed] = useState(false);

  const handleLongPress = useCallback(
    (product: Product) => {
      setActionProduct(product);
      if (!hintDismissed) setHintDismissed(true);
    },
    [hintDismissed],
  );

  const handleTileClick = useCallback(
    (id: string, modifiers: TileClickModifiers) => {
      if (modifiers.metaKey || modifiers.ctrlKey) {
        multiSelect([id]);
      } else {
        select(id);
      }
    },
    [select, multiSelect],
  );

  const handleSurfaceClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Only deselect if clicking the surface background itself
      if (e.target === e.currentTarget) {
        deselectAll();
      }
    },
    [deselectAll],
  );

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-center">
          <div className="mx-auto mb-3 size-8 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-foreground" />
          <p className="text-sm text-muted-foreground">
            Loading workspace...
          </p>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <p className="text-sm text-muted-foreground">{fetchError}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 min-h-[44px]"
            onClick={retryFetch}
          >
            Try again
          </Button>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <p className="text-sm text-muted-foreground">
            No products found. The reader returned data but no product table was detected.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 min-h-[44px]"
            onClick={retryFetch}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="workspace relative flex flex-1 flex-col overflow-auto p-4 md:p-6"
      data-phase={phase}
      style={{ "--ws-temperature": wsTemperature } as React.CSSProperties}
      onClick={handleSurfaceClick}
    >
      <AmbientLayer temperature={wsTemperature} phase={phase} energy={wsEnergy} />

      {/* Category clusters */}
      {Array.from(grouped.entries()).map(([category, categoryProducts]) => (
        <section key={category} className="mb-6">
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {category}
          </h3>
          <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(240px,1fr))]">
            {categoryProducts.map((product) => (
              <ProductTile
                key={product.id}
                product={product}
                selected={selectedIds.has(product.id)}
                onClick={(modifiers) =>
                  handleTileClick(product.id, modifiers)
                }
                onLongPress={handleLongPress}
                operation={
                  operationsByTarget.get(product.sku) ??
                  operationsByTarget.get(product.id)
                }
                phase={phase}
                proactiveIssues={
                  proactiveIssuesByTarget.get(product.sku) ??
                  proactiveIssuesByTarget.get(product.id)
                }
              />
            ))}
          </div>
        </section>
      ))}

      {/* Coach mark — first-use hint */}
      {!hintDismissed && (
        <ActionHint onDismiss={() => setHintDismissed(true)} />
      )}

      {/* FAB — quick actions */}
      <div className="sticky bottom-4 z-30 flex justify-end pointer-events-none pr-2">
        <Button
          size="lg"
          className="pointer-events-auto h-14 w-14 rounded-full shadow-lg active:scale-95 transition-transform"
          onClick={() => setFabSheetOpen(true)}
          aria-label={
            selectedIds.size > 0
              ? `Open quick actions, ${selectedIds.size} products selected`
              : "Open quick actions"
          }
        >
          <ZapIcon className="size-5" />
          {selectedIds.size > 0 && (
            <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {selectedIds.size}
            </span>
          )}
        </Button>
      </div>

      {/* Bottom sheets */}
      <ProductActionSheet
        product={actionProduct}
        open={!!actionProduct}
        onClose={() => setActionProduct(null)}
      />
      <WorkspaceActionsSheet
        open={fabSheetOpen}
        onClose={() => setFabSheetOpen(false)}
        selectedCount={selectedIds.size}
      />
    </div>
  );
}
