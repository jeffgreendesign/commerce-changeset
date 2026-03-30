"use client";

import { useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "./workspace-provider";
import { ProductTile, type TileClickModifiers } from "./product-tile";

export function LivingSurface() {
  const { products, loading, fetchError, selectedIds, select, multiSelect, deselectAll, phase, retryFetch } =
    useWorkspace();

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

  // Count promo-active products for timeline
  const promoStats = useMemo(() => {
    const total = products.length;
    const active = products.filter((p) => p.promoStatus === "active").length;
    return { total, active, pct: total > 0 ? (active / total) * 100 : 0 };
  }, [products]);

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
      className="workspace flex flex-1 flex-col overflow-auto p-4 md:p-6"
      data-phase={phase}
      onClick={handleSurfaceClick}
    >
      {/* Category clusters */}
      {Array.from(grouped.entries()).map(([category, categoryProducts]) => (
        <section key={category} className="mb-6">
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {category}
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {categoryProducts.map((product) => (
              <ProductTile
                key={product.id}
                product={product}
                selected={selectedIds.has(product.id)}
                onClick={(modifiers) =>
                  handleTileClick(product.id, modifiers)
                }
              />
            ))}
          </div>
        </section>
      ))}

      {/* Promo timeline bar */}
      {promoStats.active > 0 && (
        <div className="mt-auto pt-4">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="shrink-0">Active Promotions</span>
            <div className="promo-timeline flex-1">
              <div
                className="promo-timeline-fill"
                style={{ width: `${promoStats.pct}%` }}
              />
            </div>
            <span className="shrink-0">
              {promoStats.active} of {promoStats.total}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
