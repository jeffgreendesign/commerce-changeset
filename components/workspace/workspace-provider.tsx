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
import { z } from "zod/v4";
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
  fetchError: string | null;
  selectedIds: Set<string>;
  draftChangeset: ChangeSet | null;
  phase: WorkspacePhase;
  wsTemperature: number;
  select: (id: string) => void;
  multiSelect: (ids: string[]) => void;
  deselectAll: () => void;
  submitIntent: (text: string) => Promise<void>;
  cancelDraft: () => void;
  retryFetch: () => void;
}

// ── Response schemas ─────────────────────────────────────────────────

const ReaderResponseSchema = z.object({
  text: z.string(),
  toolCalls: z.array(z.object({ toolName: z.string(), args: z.unknown() })).optional(),
  toolResults: z.array(z.object({ toolName: z.string(), result: z.unknown() })).optional(),
});

const ChangeSetSchema = z.object({
  id: z.string(),
  requestedBy: z.string(),
  originalPrompt: z.string(),
  createdAt: z.string(),
  status: z.string(),
  operations: z.array(z.record(z.string(), z.unknown())),
  riskSummary: z.record(z.string(), z.unknown()),
}).passthrough();

const OrchestratorResponseSchema = z.object({
  changeSet: ChangeSetSchema,
  reasoning: z.string(),
  readerText: z.string().optional(),
});

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx)
    throw new Error("useWorkspace must be used inside <WorkspaceProvider>");
  return ctx;
}

// ── Markdown parser ─────────────────────────────────────────────────

/** Default column order when header heuristics fail to match. */
const FALLBACK_COLUMN_ORDER = ["name", "sku", "price", "inventory", "promo", "category"];

function parseProductsFromMarkdown(text: string): Product[] {
  const products: Product[] = [];
  const lines = text.split("\n");

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

      // Positional fallback when header heuristics matched fewer than 2 columns
      if (Object.keys(columnMap).length < 2 && cells.length >= 2) {
        columnMap = {};
        FALLBACK_COLUMN_ORDER.forEach((key, i) => {
          if (i < cells.length) columnMap[key] = i;
        });
      }
      continue;
    }

    // Skip separator row (---|----|---)
    if (trimmed.includes("---")) {
      headerParsed = true;
      continue;
    }

    if (!headerParsed) continue;

    // Data row — safe indexing with bounds check
    const safeCell = (key: string): string => {
      const idx = columnMap[key];
      return idx !== undefined && idx < cells.length ? cells[idx] : "";
    };

    const name = safeCell("name");
    const sku = safeCell("sku");
    const priceStr = safeCell("price") || "0";
    const inventoryStr = safeCell("inventory") || "0";
    const promoStr = safeCell("promo").toLowerCase();
    const category = (safeCell("category") || "uncategorized").toLowerCase();

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

  if (products.length === 0 && text.trim().length > 0) {
    console.warn("[workspace] parseProductsFromMarkdown: non-empty text but 0 products parsed");
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
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [draftChangeset, setDraftChangeset] = useState<ChangeSet | null>(null);
  const [phase, setPhase] = useState<WorkspacePhase>("idle");
  const [fetchAttempt, setFetchAttempt] = useState(0);

  const wsTemperature = temperatureFromPhase(phase);

  const retryFetch = useCallback(() => {
    setFetchError(null);
    setLoading(true);
    setFetchAttempt((n) => n + 1);
  }, []);

  // Fetch products on mount and on retry
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
          const errorBody = await res.text().catch(() => "");
          console.error("[workspace] Reader API error:", res.status, errorBody);
          if (!cancelled) {
            if (res.status === 403 && errorBody.includes("google_connection_required")) {
              setFetchError("Google account not connected. Visit the Chat view and connect your Google account to load product data.");
            } else if (res.status === 403 && errorBody.includes("missing_refresh_token")) {
              setFetchError("Session expired. Please log out and log back in.");
            } else {
              setFetchError(`Failed to load products (${res.status}). Try again or use Chat view.`);
            }
            setLoading(false);
          }
          return;
        }

        const json: unknown = await res.json();
        const validated = ReaderResponseSchema.safeParse(json);
        if (!validated.success) {
          console.error("[workspace] Invalid reader response:", validated.error);
          if (!cancelled) {
            setFetchError("Unexpected response from the reader. Try again.");
            setLoading(false);
          }
          return;
        }
        if (!cancelled) {
          const parsed = parseProductsFromMarkdown(validated.data.text);
          setProducts(parsed);
          setFetchError(null);
          setLoading(false);
        }
      } catch (err) {
        console.error("[workspace] Failed to fetch products:", err);
        if (!cancelled) {
          setFetchError("Network error. Check your connection and try again.");
          setLoading(false);
        }
      }
    }

    fetchProducts();
    return () => {
      cancelled = true;
    };
  }, [fetchAttempt]);

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

        const json: unknown = await res.json();
        const validated = OrchestratorResponseSchema.safeParse(json);
        if (!validated.success) {
          console.error("[workspace] Invalid orchestrator response:", validated.error);
          setPhase("error");
          return;
        }
        // Schema validates structural shape; cast through unknown since Zod passthrough
        // infers a wider type than the full ChangeSet with its deep nested types
        setDraftChangeset(validated.data.changeSet as unknown as ChangeSet);
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
      fetchError,
      selectedIds,
      draftChangeset,
      phase,
      wsTemperature,
      select,
      multiSelect,
      deselectAll,
      submitIntent,
      cancelDraft,
      retryFetch,
    }),
    [
      products,
      loading,
      fetchError,
      selectedIds,
      draftChangeset,
      phase,
      wsTemperature,
      select,
      multiSelect,
      deselectAll,
      submitIntent,
      cancelDraft,
      retryFetch,
    ],
  );

  return (
    <WorkspaceContext.Provider value={ctx}>
      {children}
    </WorkspaceContext.Provider>
  );
}
