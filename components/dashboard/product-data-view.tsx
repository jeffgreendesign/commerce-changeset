"use client";

import { useMemo } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────

interface ProductRow {
  [key: string]: string;
}

interface ProductDataViewProps {
  /** Raw markdown text that may contain tables. */
  markdown: string;
}

// ── Parse markdown tables into structured data ───────────────────────

function parseMarkdownTables(md: string): { headers: string[]; rows: string[][] }[] {
  const tables: { headers: string[]; rows: string[][] }[] = [];
  const lines = md.split("\n");

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    // Detect table header row (contains pipes)
    if (line.startsWith("|") && line.endsWith("|")) {
      const headers = line
        .split("|")
        .slice(1, -1)
        .map((h) => h.trim());

      // Skip separator row
      if (i + 1 < lines.length && /^\|[\s:|-]+\|$/.test(lines[i + 1].trim())) {
        i += 2;
        const rows: string[][] = [];
        while (i < lines.length) {
          const rowLine = lines[i].trim();
          if (!rowLine.startsWith("|") || !rowLine.endsWith("|")) break;
          rows.push(
            rowLine
              .split("|")
              .slice(1, -1)
              .map((c) => c.trim()),
          );
          i++;
        }
        if (headers.length > 0 && rows.length > 0) {
          tables.push({ headers, rows });
        }
        continue;
      }
    }
    i++;
  }

  return tables;
}

function isPrice(val: string): boolean {
  return /^\$[\d,]+\.?\d*$/.test(val.trim());
}

function formatPrice(val: string): string {
  const num = parseFloat(val.replace(/[$,]/g, ""));
  if (isNaN(num)) return val;
  return `$${num.toFixed(2)}`;
}

/** Normalize promo active flag from various sources. */
function isPromoActiveFlag(value: string): boolean {
  const v = value.trim().toUpperCase();
  return v === "TRUE" || v === "YES" || v === "ACTIVE" || v === "1";
}

/** Check if a promo price value represents an actual promo. */
function hasPromoPrice(promoPrice: string): boolean {
  return !!promoPrice && promoPrice !== "" && promoPrice !== "$0.00";
}

// ── Product Card (mobile) ────────────────────────────────────────────

function ProductCard({ row, headers }: { row: ProductRow; headers: string[] }) {
  const name = row["Name"] ?? row["Product"] ?? row["Product Name"] ?? headers.map((h) => row[h]).find(Boolean) ?? "";
  const sku = row["SKU"] ?? row["ID"] ?? "";
  const basePrice = row["Base Price"] ?? row["Price"] ?? "";
  const promoPrice = row["Promo Price"] ?? row["Sale Price"] ?? "";
  const promoActive = row["Promo Active"] ?? row["On Sale"] ?? "";
  const category = row["Category"] ?? "";
  const inventory = row["Inventory"] ?? row["Stock"] ?? "";

  const isPromoActive = isPromoActiveFlag(promoActive);
  const hasPromo = hasPromoPrice(promoPrice);

  return (
    <div className="group relative min-w-[240px] snap-center rounded-xl border bg-card/80 p-4 backdrop-blur-sm transition-all active:scale-[0.98]">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-sm font-semibold leading-tight">{name}</h4>
          {sku && (
            <code className="mt-0.5 block text-[10px] text-muted-foreground font-mono">
              {sku}
            </code>
          )}
        </div>
        {category && (
          <Badge variant="secondary" className="shrink-0 text-[10px] px-1.5 py-0">
            {category}
          </Badge>
        )}
      </div>

      {/* Price block */}
      <div className="mb-3">
        <div className="flex items-baseline gap-2">
          {hasPromo && isPromoActive ? (
            <>
              <span className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                {formatPrice(promoPrice)}
              </span>
              <span className="text-sm tabular-nums text-muted-foreground line-through">
                {formatPrice(basePrice)}
              </span>
            </>
          ) : (
            <span className="text-xl font-bold tabular-nums">
              {basePrice ? formatPrice(basePrice) : "—"}
            </span>
          )}
        </div>
        {hasPromo && isPromoActive && basePrice && promoPrice && (
          <div className="mt-1 flex items-center gap-1.5">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
            </span>
            <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
              Promo active
            </span>
            {(() => {
              const base = parseFloat(basePrice.replace(/[$,]/g, ""));
              const promo = parseFloat(promoPrice.replace(/[$,]/g, ""));
              if (!isNaN(base) && !isNaN(promo) && base > 0) {
                const pct = Math.round(((base - promo) / base) * 100);
                return (
                  <Badge className="border-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] px-1 py-0">
                    -{pct}%
                  </Badge>
                );
              }
              return null;
            })()}
          </div>
        )}
      </div>

      {/* Footer meta */}
      {inventory && (
        <div className="text-[10px] text-muted-foreground">
          Inventory: <span className="font-medium text-foreground">{inventory}</span>
        </div>
      )}
    </div>
  );
}

// ── Enhanced Table (desktop) ─────────────────────────────────────────

function EnhancedTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            {headers.map((h) => (
              <TableHead
                key={h}
                className={cn(
                  "text-xs font-semibold whitespace-nowrap",
                  (h.includes("Price") || h.includes("Cost") || h === "Inventory") && "text-right",
                )}
              >
                {h}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, ri) => (
            <TableRow
              key={ri}
              className={cn(
                "transition-colors",
                ri % 2 === 1 && "bg-muted/20",
              )}
            >
              {row.map((cell, ci) => {
                const header = headers[ci] ?? "";
                const isPromoActive = header === "Promo Active" && isPromoActiveFlag(cell);
                const isPriceCol = header.includes("Price") || header.includes("Cost");
                return (
                  <TableCell
                    key={ci}
                    className={cn(
                      "text-sm whitespace-nowrap",
                      isPriceCol && "text-right tabular-nums font-medium",
                      header === "SKU" && "font-mono text-xs",
                      header === "Inventory" && "text-right tabular-nums",
                    )}
                  >
                    {isPromoActive ? (
                      <span className="inline-flex items-center gap-1">
                        <span className="relative flex size-1.5">
                          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
                        </span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">Active</span>
                      </span>
                    ) : header === "Promo Active" && cell ? (
                      <span className="text-muted-foreground">{cell}</span>
                    ) : isPriceCol && isPrice(cell) ? (
                      formatPrice(cell)
                    ) : (
                      cell
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────

export function ProductDataView({ markdown }: ProductDataViewProps) {
  const tables = useMemo(() => parseMarkdownTables(markdown), [markdown]);

  if (tables.length === 0) return null;

  // Check if any table looks like product data (has Name/SKU/Price columns)
  const productTableIndex = tables.findIndex(
    (t) =>
      t.headers.some((h) => /name|product/i.test(h)) &&
      t.headers.some((h) => /price|cost/i.test(h)),
  );

  return (
    <div className="space-y-4">
      {tables.map((table, ti) => {
        const isProductTable = ti === productTableIndex;

        if (isProductTable) {
          // Build row objects for card view
          const rowObjects: ProductRow[] = table.rows.map((row) =>
            Object.fromEntries(table.headers.map((h, i) => [h, row[i] ?? ""])),
          );

          return (
            <div key={ti}>
              {/* Mobile: horizontal scrolling cards */}
              <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-none sm:hidden -mx-4 px-4">
                {rowObjects.map((row, ri) => (
                  <ProductCard key={ri} row={row} headers={table.headers} />
                ))}
              </div>

              {/* Desktop: enhanced table */}
              <div className="hidden sm:block">
                <EnhancedTable headers={table.headers} rows={table.rows} />
              </div>
            </div>
          );
        }

        // Non-product tables: always render as enhanced tables
        return (
          <div key={ti} className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <EnhancedTable headers={table.headers} rows={table.rows} />
          </div>
        );
      })}
    </div>
  );
}
