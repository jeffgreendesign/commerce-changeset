"use client";

import { cn } from "@/lib/utils";
import type { Product } from "./workspace-provider";

export interface TileClickModifiers {
  metaKey: boolean;
  ctrlKey: boolean;
}

interface ProductTileProps {
  product: Product;
  selected: boolean;
  onClick: (modifiers: TileClickModifiers) => void;
}

export function ProductTile({ product, selected, onClick }: ProductTileProps) {
  return (
    <div
      className={cn(
        "product-tile cursor-pointer px-4 py-4 min-h-[44px]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
      )}
      role="option"
      tabIndex={0}
      aria-selected={selected}
      aria-label={`${product.name}, ${product.sku}, $${product.price.toFixed(2)}`}
      data-selected={selected}
      data-promo={product.promoStatus}
      data-category={product.category}
      onClick={(e) => onClick({ metaKey: e.metaKey, ctrlKey: e.ctrlKey })}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick({ metaKey: e.metaKey, ctrlKey: e.ctrlKey });
        }
      }}
    >
      {/* Product name */}
      <p className="text-sm font-medium leading-tight truncate">
        {product.name}
      </p>

      {/* SKU */}
      <p className="mt-0.5 text-[11px] text-muted-foreground tracking-wide">
        {product.sku}
      </p>

      {/* Price — large, bold */}
      <p className="mt-2 text-2xl font-bold tracking-tight">
        ${product.price.toFixed(2)}
      </p>

      {/* Inventory + promo row */}
      <div className="mt-1.5 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {product.inventory.toLocaleString()} units
        </span>
        {product.promoStatus === "active" && (
          <span
            className="inline-block size-2.5 rounded-full"
            style={{ background: "oklch(0.65 0.2 145)" }}
            aria-label="Active promotion"
          />
        )}
      </div>
    </div>
  );
}
