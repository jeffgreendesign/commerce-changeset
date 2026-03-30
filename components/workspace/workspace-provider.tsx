"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import type { ChangeSet } from "@/lib/changeset/types";

// ── Types ────────────────────────────────────────────────────────────

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  inventory: number;
  promoStatus: "active" | "inactive";
  category: string;
}

export type WorkspacePhase =
  | "idle"
  | "preview"
  | "executing"
  | "complete"
  | "error";

interface WorkspaceContextValue {
  products: Product[];
  loading: boolean;
  selectedIds: Set<string>;
  draftChangeset: ChangeSet | null;
  phase: WorkspacePhase;
  wsTemperature: number;
  select: (id: string) => void;
  multiSelect: (ids: string[]) => void;
  deselectAll: () => void;
  submitIntent: (text: string) => Promise<void>;
  cancelDraft: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx)
    throw new Error("useWorkspace must be used inside <WorkspaceProvider>");
  return ctx;
}

// ── Markdown parser ─────────────────────────────────────────────────

function parseProductsFromMarkdown(text: string): Product[] {
  const products: Product[] = [];
  const lines = text.split("\n");

  // Find markdown table rows (skip header + separator)
  let inTable = false;
  let headerParsed = false;
  let columnMap: Record<string, number> = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) {
      inTable = false;
      headerParsed = false;
      columnMap = {};
      continue;
    }

    const cells = trimmed
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());

    if (!inTable) {
      // First row with | is the header
      inTable = true;
      cells.forEach((cell, i) => {
        const lower = cell.toLowerCase();
        if (lower.includes("name") || lower.includes("product"))
          columnMap["name"] = i;
        if (lower.includes("sku") || lower.includes("id"))
          columnMap["sku"] = i;
        if (lower.includes("price")) columnMap["price"] = i;
        if (lower.includes("inventory") || lower.includes("stock") || lower.includes("quantity"))
          columnMap["inventory"] = i;
        if (lower.includes("promo") || lower.includes("status"))
          columnMap["promo"] = i;
        if (lower.includes("category") || lower.includes("type"))
          columnMap["category"] = i;
      });
      continue;
    }

    // Skip separator row (---|----|---)
    if (trimmed.includes("---")) {
      headerParsed = true;
      continue;
    }

    if (!headerParsed) continue;

    // Data row
    const name = cells[columnMap["name"]] ?? "";
    const sku = cells[columnMap["sku"]] ?? "";
    const priceStr = cells[columnMap["price"]] ?? "0";
    const inventoryStr = cells[columnMap["inventory"]] ?? "0";
    const promoStr = (cells[columnMap["promo"]] ?? "").toLowerCase();
    const category = (cells[columnMap["category"]] ?? "uncategorized").toLowerCase();

    if (!name && !sku) continue;

    const price = parseFloat(priceStr.replace(/[^0-9.]/g, "")) || 0;
    const inventory = parseInt(inventoryStr.replace(/[^0-9]/g, ""), 10) || 0;
    const promoStatus: "active" | "inactive" =
      promoStr.includes("active") || promoStr.includes("yes") || promoStr.includes("on")
        ? "active"
        : "inactive";

    products.push({
      id: sku || `product-${products.length}`,
      name,
      sku,
      price,
      inventory,
      promoStatus,
      category,
    });
  }

  return products;
}

// ── Temperature derivation ──────────────────────────────────────────

function temperatureFromPhase(phase: WorkspacePhase): number {
  switch (phase) {
    case "idle":
    case "complete":
      return 0;
    case "preview":
      return 0.5;
    case "executing":
      return 1;
    case "error":
      return 0;
  }
}

// ── Provider ────────────────────────────────────────────────────────

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [draftChangeset, setDraftChangeset] = useState<ChangeSet | null>(null);
  const [phase, setPhase] = useState<WorkspacePhase>("idle");

  const wsTemperature = temperatureFromPhase(phase);

  // Fetch products on mount
  useEffect(() => {
    let cancelled = false;

    async function fetchProducts() {
      try {
        const res = await fetch("/api/reader", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message:
              "Show me all products with their names, SKUs, prices, inventory counts, promo status, and categories in a markdown table",
          }),
        });

        if (!res.ok) {
          console.error("[workspace] Reader API error:", res.status);
          setLoading(false);
          return;
        }

        const data: { text: string } = await res.json();
        if (!cancelled) {
          const parsed = parseProductsFromMarkdown(data.text);
          setProducts(parsed);
          setLoading(false);
        }
      } catch (err) {
        console.error("[workspace] Failed to fetch products:", err);
        if (!cancelled) setLoading(false);
      }
    }

    fetchProducts();
    return () => {
      cancelled = true;
    };
  }, []);

  const select = useCallback((id: string) => {
    setSelectedIds(new Set([id]));
  }, []);

  const multiSelect = useCallback((ids: string[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
      }
      return next;
    });
  }, []);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const submitIntent = useCallback(
    async (text: string) => {
      setPhase("preview");
      try {
        const selectedProducts = products.filter((p) =>
          selectedIds.has(p.id),
        );
        const context =
          selectedProducts.length > 0
            ? `\n\nSelected products: ${selectedProducts.map((p) => `${p.name} (${p.sku})`).join(", ")}`
            : "";

        const res = await fetch("/api/orchestrator", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text + context }),
        });

        if (!res.ok) {
          setPhase("error");
          return;
        }

        const data: { changeSet: ChangeSet } = await res.json();
        setDraftChangeset(data.changeSet);
      } catch {
        setPhase("error");
      }
    },
    [products, selectedIds],
  );

  const cancelDraft = useCallback(() => {
    setDraftChangeset(null);
    setPhase("idle");
  }, []);

  const ctx = useMemo<WorkspaceContextValue>(
    () => ({
      products,
      loading,
      selectedIds,
      draftChangeset,
      phase,
      wsTemperature,
      select,
      multiSelect,
      deselectAll,
      submitIntent,
      cancelDraft,
    }),
    [
      products,
      loading,
      selectedIds,
      draftChangeset,
      phase,
      wsTemperature,
      select,
      multiSelect,
      deselectAll,
      submitIntent,
      cancelDraft,
    ],
  );

  return (
    <WorkspaceContext.Provider value={ctx}>
      {children}
    </WorkspaceContext.Provider>
  );
}
