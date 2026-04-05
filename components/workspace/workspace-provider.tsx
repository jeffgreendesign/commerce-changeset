"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { z } from "zod/v4";
import type { ChangeSet, ChangeSetStatus, Operation, OperationDiff } from "@/lib/changeset/types";
import type { ProactiveIssue } from "@/lib/voice/types";
import { runProactiveChecks } from "@/lib/voice/proactive-insights";
import {
  subscribeTimeline,
  getTimelineSnapshot,
  getTimelineServerSnapshot,
  appendTimelineEntry,
  type TimelineEntry,
} from "@/lib/timeline-history";

// ── Types ────────────────────────────────────────────────────────────

// TimelineEntry is imported from @/lib/timeline-history and re-exported
export type { TimelineEntry } from "@/lib/timeline-history";

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  promoPrice: number | null;
  inventory: string;
  promoStatus: "active" | "inactive";
  category: string;
  imageUrl?: string | null;
}

const INVENTORY_LABELS: Record<string, string> = {
  in_stock: "In Stock",
  low_stock: "Low Stock",
  out_of_stock: "Out of Stock",
  discontinued: "Discontinued",
  pre_order: "Pre-Order",
};

export function inventoryLabel(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return value;
  const label = INVENTORY_LABELS[trimmed];
  if (label) return label;
  const num = Number(trimmed);
  if (!Number.isNaN(num)) return `${num.toLocaleString()} units`;
  return value;
}

export type WorkspacePhase =
  | "idle"
  | "preview"
  | "executing"
  | "complete"
  | "error";

/** Phase values reported by the Chat component (superset of WorkspacePhase). */
export type ChatActivityPhase =
  | "idle"
  | "loading"
  | "draft"
  | "executing"
  | "rolling_back"
  | "complete"
  | "denied"
  | "error";

interface WorkspaceContextValue {
  products: Product[];
  loading: boolean;
  fetchError: string | null;
  executionError: string | null;
  selectedIds: Set<string>;
  draftChangeset: ChangeSet | null;
  phase: WorkspacePhase;
  wsTemperature: number;
  wsEnergy: number;
  proactiveIssues: ProactiveIssue[];
  proactiveIssuesByTarget: Map<string, ProactiveIssue[]>;
  select: (id: string) => void;
  multiSelect: (ids: string[]) => void;
  deselectAll: () => void;
  submitIntent: (text: string) => Promise<ChangeSet | null>;
  /** Submit an intent scoped to a single product (used by the inspector). */
  submitIntentForProduct: (text: string, productId: string) => Promise<ChangeSet | null>;
  executeChangeset: (overrideCs?: ChangeSet) => Promise<{ success: boolean; status?: string; error?: string }>;
  cancelDraft: () => void;
  retryFetch: () => void;
  /** Apply diffs from an externally-executed changeset (e.g. from the chat view). */
  applyExecutedChangeset: (cs: ChangeSet) => void;
  /** Chat-reported activity phase (for the Activity panel when workspace is idle). */
  chatActivityPhase: ChatActivityPhase;
  /** Chat-reported changeset (for the Activity panel when workspace is idle). */
  chatActivityChangeset: ChangeSet | null;
  /** Called by the Chat component to sync its phase/changeset into the workspace context. */
  reportChatActivity: (phase: ChatActivityPhase, changeset?: ChangeSet | null) => void;
  /** Session-level changeset history (survives view switches). */
  changesetHistory: TimelineEntry[];
  /** ISO timestamp of when this browser session started (for filtering). */
  sessionStart: string;
}

// ── Response schemas ─────────────────────────────────────────────────

const ReaderResponseSchema = z.object({
  text: z.string(),
  toolCalls: z.array(z.object({ toolName: z.string(), args: z.unknown() })).optional(),
  toolResults: z.array(z.object({ toolName: z.string(), result: z.unknown() })).optional(),
});

/** Schema for the get_products tool result from the Reader agent. */
const ProductToolResultSchema = z.object({
  products: z.array(z.record(z.string(), z.string())),
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

const ExecutorResponseSchema = z.object({
  changeSet: ChangeSetSchema,
}).passthrough();

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx)
    throw new Error("useWorkspace must be used inside <WorkspaceProvider>");
  return ctx;
}

// ── Extract products from tool results ──────────────────────────────

function parseProductsFromToolResults(
  toolResults: Array<{ toolName: string; result: unknown }>,
): Product[] {
  const productResult = toolResults.find((tr) => tr.toolName === "get_products");
  if (!productResult) return [];

  const parsed = ProductToolResultSchema.safeParse(productResult.result);
  if (!parsed.success) {
    console.error("[workspace] ProductToolResultSchema validation failed:", parsed.error.message);
    return [];
  }

  return parsed.data.products
    .filter((row) => row["Name"] || row["SKU"])
    .map((row, i) => {
      const priceStr = row["Base Price"] ?? row["Price"] ?? "0";
      const promoPriceStr = row["Promo Price"] ?? "";
      const inventoryStr = row["Inventory"] || row["Stock"] || "in_stock";
      const promoStr = (row["Promo Active"] ?? row["On Sale"] ?? "").toLowerCase();
      const sku = row["SKU"] ?? row["ID"] ?? "";
      const parsedPromoPrice = parseFloat(promoPriceStr.replace(/[^0-9.]/g, ""));

      return {
        id: sku || `product-${i}`,
        name: row["Name"] ?? row["Product"] ?? row["Product Name"] ?? "",
        sku,
        price: parseFloat(priceStr.replace(/[^0-9.]/g, "")) || 0,
        promoPrice: Number.isNaN(parsedPromoPrice) ? null : parsedPromoPrice,
        inventory: inventoryStr.toLowerCase().trim(),
        promoStatus:
          promoStr === "true" || promoStr === "yes" || promoStr === "active" || promoStr === "on"
            ? ("active" as const)
            : ("inactive" as const),
        category: (row["Category"] ?? row["Type"] ?? "uncategorized").toLowerCase(),
        imageUrl: row["Image URL"] || null,
      };
    });
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
        // Distinguish "Promo Price" from "Base Price" / "Price"
        if (lower.includes("promo") && lower.includes("price")) {
          columnMap["promoPrice"] = i;
        } else if (lower.includes("price")) {
          columnMap["price"] = i;
        }
        if (lower.includes("inventory") || lower.includes("stock") || lower.includes("quantity"))
          columnMap["inventory"] = i;
        if (lower.includes("promo") && !lower.includes("price")) {
          // "Promo Active", "Promo Status", etc. — but NOT "Promo Price"
          columnMap["promo"] = i;
        }
        if (lower.includes("status") && !lower.includes("promo"))
          columnMap["promo"] = i;
        if (lower.includes("category") || lower.includes("type"))
          columnMap["category"] = i;
        if (lower.includes("image"))
          columnMap["imageUrl"] = i;
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
    const promoPriceStr = safeCell("promoPrice");
    const inventoryStr = safeCell("inventory") || "in_stock";
    const promoStr = safeCell("promo").toLowerCase();
    const category = (safeCell("category") || "uncategorized").toLowerCase();
    const imageUrl = safeCell("imageUrl");

    if (!name && !sku) continue;

    const price = parseFloat(priceStr.replace(/[^0-9.]/g, "")) || 0;
    const parsedPromoPrice = parseFloat(promoPriceStr.replace(/[^0-9.]/g, ""));
    const inventory = inventoryStr.toLowerCase().trim();
    const promoStatus: "active" | "inactive" =
      promoStr.includes("active") || promoStr.includes("yes") || promoStr.includes("on")
        ? "active"
        : "inactive";

    products.push({
      id: sku || `product-${products.length}`,
      name,
      sku,
      price,
      promoPrice: Number.isNaN(parsedPromoPrice) ? null : parsedPromoPrice,
      inventory,
      promoStatus,
      category,
      imageUrl: imageUrl || null,
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

// ── Energy derivation ──────────────────────────────────────────────

function energyFromPhase(phase: WorkspacePhase, operationCount: number): number {
  switch (phase) {
    case "idle":
    case "complete":
      return 0;
    case "preview":
      return Math.min(operationCount / 10, 1);
    case "executing":
      return 1;
    case "error":
      return 0;
  }
}

// ── Product → Record conversion for proactive checks ──────────────

function productsToRecords(products: Product[]): Record<string, string>[] {
  return products.map((p) => ({
    SKU: p.sku,
    "Base Price": String(p.price),
    "Promo Price": p.promoPrice != null ? String(p.promoPrice) : "",
    "Promo Active": p.promoStatus === "active" ? "TRUE" : "FALSE",
    Inventory: p.inventory,
  }));
}

/**
 * Return operations that succeeded according to execution results.
 * When results aren't provided (undefined/null), returns all operations
 * as a best-effort fallback. When results exist but none succeeded,
 * returns an empty array.
 */
function filterSuccessfulOps(
  operations: Operation[],
  results: Array<{ status: string; operationId: string }> | undefined | null,
): Operation[] {
  if (!Array.isArray(results)) return operations;
  const successIds = new Set(
    results.filter((r) => r.status === "success").map((r) => r.operationId),
  );
  return operations.filter((op) => successIds.has(op.id));
}

// ── Apply diffs to products after execution ────────────────────────

function applyDiffsToProducts(
  products: Product[],
  operations: Operation[],
): Product[] {
  // Match operations to products by SKU. The orchestrator produces targets
  // like "STR-001 Classic Runner" (SKU + name) while product.sku is just
  // "STR-001", so we check startsWith rather than exact equality.
  // Bulk operations embed SKUs in diff field names (e.g. "Promo Price (STR-001)").
  return products.map((p) => {
    const matchingDiffs: OperationDiff[] = [];
    for (const op of operations) {
      if (typeof op.target !== "string" || !Array.isArray(op.diff)) continue;
      // Bulk operations embed per-SKU fields (e.g. "Promo Price (STR-001)"),
      // so always filter by SKU — even if the target happens to match via
      // startsWith. Check bulk FIRST to avoid pushing unfiltered diffs.
      if (op.action === "bulk_price_change" && p.sku) {
        const skuDiffs = op.diff.filter((d) => d.field.includes(p.sku));
        matchingDiffs.push(...skuDiffs);
        continue;
      }
      const target = op.target;
      if (
        target === p.sku ||
        target === p.id ||
        (p.sku && target.startsWith(p.sku))
      ) {
        matchingDiffs.push(...op.diff);
      }
    }
    if (matchingDiffs.length === 0) return p;
    const updated = { ...p };
    for (const d of matchingDiffs) {
      const field = d.field.toLowerCase();
      if (field.includes("price")) {
        const val =
          typeof d.after === "number"
            ? d.after
            : parseFloat(String(d.after).replace(/[^0-9.]/g, ""));
        if (!Number.isNaN(val)) {
          // "Promo Price" → promoPrice only; "Base Price" or plain "Price" → price only.
          // Do NOT set both — promo updates must preserve the base price so
          // productsToRecords() and product tiles show the correct values.
          if (field.includes("promo")) {
            updated.promoPrice = val;
          } else {
            updated.price = val;
          }
        }
      } else if (field.includes("inventory") || field.includes("stock")) {
        updated.inventory = String(d.after).toLowerCase().trim();
      } else if (field.includes("promo") || field.includes("status")) {
        // "Promo Active" / "Promo Status" — NOT "Promo Price" (handled above via else-if)
        const val = String(d.after).toLowerCase();
        updated.promoStatus =
          val === "active" || val === "true" || val === "yes" || val === "on"
            ? "active"
            : "inactive";
      }
    }
    return updated;
  });
}

// ── Provider ────────────────────────────────────────────────────────

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [draftChangeset, setDraftChangeset] = useState<ChangeSet | null>(null);
  const [phase, setPhase] = useState<WorkspacePhase>("idle");
  const [chatActivityPhase, setChatActivityPhase] = useState<ChatActivityPhase>("idle");
  const [chatActivityChangeset, setChatActivityChangeset] = useState<ChangeSet | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [fetchAttempt, setFetchAttempt] = useState(0);
  const executeInFlightRef = useRef(false);

  // ── Timeline history (useSyncExternalStore — SSR-safe, no hydration mismatch) ──
  const changesetHistory = useSyncExternalStore(
    subscribeTimeline,
    getTimelineSnapshot,
    getTimelineServerSnapshot,
  );
  const [sessionStart] = useState(() => new Date().toISOString());

  // Capture workspace-executed changesets into timeline when phase
  // transitions from "executing" → "complete".
  const prevPhaseRef = useRef(phase);
  useEffect(() => {
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = phase;
    if (
      prev === "executing" &&
      phase === "complete" &&
      draftChangeset &&
      draftChangeset.execution?.receipt &&
      (draftChangeset.status === "completed" ||
        draftChangeset.status === "partial_failure" ||
        draftChangeset.status === "executing")
    ) {
      const terminalStatus: ChangeSetStatus =
        draftChangeset.status === "executing"
          ? "completed"
          : draftChangeset.status;
      appendTimelineEntry({
        changeset: { ...draftChangeset, status: terminalStatus },
        completedAt: new Date().toISOString(),
      });
    }
  }, [phase, draftChangeset]);

  const wsTemperature = temperatureFromPhase(phase);

  const opCount = draftChangeset?.operations.length ?? 0;
  const wsEnergy = energyFromPhase(phase, opCount);

  // ── Proactive issue detection ──────────────────────────────────────

  const proactiveIssues = useMemo<ProactiveIssue[]>(() => {
    if (!draftChangeset || !Array.isArray(draftChangeset.operations) || draftChangeset.operations.length === 0) {
      return [];
    }
    const productRecords = productsToRecords(products);
    return runProactiveChecks(draftChangeset.operations, productRecords);
  }, [draftChangeset, products]);

  const proactiveIssuesByTarget = useMemo(() => {
    const map = new Map<string, ProactiveIssue[]>();

    const addToMap = (key: string, issue: ProactiveIssue) => {
      const existing = map.get(key);
      if (existing) {
        existing.push(issue);
      } else {
        map.set(key, [issue]);
      }
    };

    for (const issue of proactiveIssues) {
      // Index by the raw operationId (may be full target like "STR-001 Classic Runner")
      addToMap(issue.operationId, issue);

      // Also index by extracted SKU so lookups by product.sku always match.
      // Matches the extractSku pattern used in proactive-insights.ts.
      const skuMatch = issue.operationId.match(/([A-Z]{2,}-\d{3,})/);
      if (skuMatch && skuMatch[1] !== issue.operationId) {
        addToMap(skuMatch[1], issue);
      }
    }
    return map;
  }, [proactiveIssues]);

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
              "Show me all products with their names, SKUs, prices, inventory counts, promo status, and categories",
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
          // Try structured tool results first (get_products returns typed objects)
          let parsed: Product[] = [];
          if (validated.data.toolResults && validated.data.toolResults.length > 0) {
            parsed = parseProductsFromToolResults(validated.data.toolResults);
          }
          // Fall back to parsing markdown tables from the LLM text response
          if (parsed.length === 0) {
            parsed = parseProductsFromMarkdown(validated.data.text);
          }
          if (parsed.length === 0) {
            // Detect auth errors from the LLM's response text
            const lowerText = validated.data.text.toLowerCase();
            if (lowerText.includes("authorization") || lowerText.includes("unable to access") || lowerText.includes("authentication")) {
              setFetchError("Google Sheets authorization failed. Check that your Google account is connected and GOOGLE_SHEET_ID is set.");
            } else {
              setFetchError("No products returned. The reader agent may not have been able to access the product catalog.");
            }
          } else {
            setFetchError(null);
          }
          setProducts(parsed);
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
    async (text: string): Promise<ChangeSet | null> => {
      setPhase("preview");
      setExecutionError(null);
      setDraftChangeset(null); // clear stale draft immediately
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
          setDraftChangeset(null);
          setPhase("error");
          return null;
        }

        const json: unknown = await res.json();
        const validated = OrchestratorResponseSchema.safeParse(json);
        if (!validated.success) {
          console.error("[workspace] Invalid orchestrator response:", validated.error);
          setDraftChangeset(null);
          setPhase("error");
          return null;
        }
        // Schema validates structural shape; cast through unknown since Zod passthrough
        // infers a wider type than the full ChangeSet with its deep nested types
        const cs = validated.data.changeSet as unknown as ChangeSet;
        if (!Array.isArray(cs.operations) || cs.operations.length === 0) {
          console.error("[workspace] Orchestrator returned changeset with 0 operations");
          setExecutionError("No operations generated — try a more specific request (e.g. \"Change price to $79\")");
          setDraftChangeset(null);
          setPhase("error");
          return null;
        }
        setDraftChangeset(cs);
        return cs;
      } catch {
        setDraftChangeset(null);
        setPhase("error");
        return null;
      }
    },
    [products, selectedIds],
  );

  const submitIntentForProduct = useCallback(
    async (text: string, productId: string): Promise<ChangeSet | null> => {
      setPhase("preview");
      setExecutionError(null);
      setDraftChangeset(null); // clear stale draft immediately
      try {
        const targetProduct = products.find((p) => p.id === productId);
        if (!targetProduct) {
          setExecutionError("Product not found — it may have been removed. Please try again.");
          setDraftChangeset(null);
          setPhase("error");
          return null;
        }
        const context = `\n\nSelected products: ${targetProduct.name} (${targetProduct.sku})`;

        const res = await fetch("/api/orchestrator", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text + context }),
        });

        if (!res.ok) {
          setDraftChangeset(null);
          setPhase("error");
          return null;
        }

        const json: unknown = await res.json();
        const validated = OrchestratorResponseSchema.safeParse(json);
        if (!validated.success) {
          console.error("[workspace] Invalid orchestrator response:", validated.error);
          setDraftChangeset(null);
          setPhase("error");
          return null;
        }
        const cs = validated.data.changeSet as unknown as ChangeSet;
        if (!Array.isArray(cs.operations) || cs.operations.length === 0) {
          console.error("[workspace] Orchestrator returned changeset with 0 operations");
          setExecutionError("No operations generated — try a more specific request (e.g. \"Change price to $79\")");
          setDraftChangeset(null);
          setPhase("error");
          return null;
        }
        setDraftChangeset(cs);
        return cs;
      } catch {
        setDraftChangeset(null);
        setPhase("error");
        return null;
      }
    },
    [products],
  );

  const executeChangeset = useCallback(async (overrideCs?: ChangeSet): Promise<{ success: boolean; status?: string; error?: string }> => {
    // Allow callers (e.g. voice tool handlers) to pass the changeset directly,
    // bypassing stale React state from closure capture.
    const cs = overrideCs ?? draftChangeset;
    if (!cs || executeInFlightRef.current) {
      return { success: false, status: "ignored", error: cs ? "Execution already in flight" : "No changeset to execute" };
    }
    executeInFlightRef.current = true;
    setPhase("executing");
    setExecutionError(null);
    try {
      const res = await fetch("/api/orchestrator/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changeSet: cs }),
      });
      if (!res.ok) {
        let msg = "Execution failed";
        try {
          const errBody = (await res.json()) as Record<string, unknown>;
          const nested =
            errBody.error &&
            typeof errBody.error === "object" &&
            "message" in (errBody.error as Record<string, unknown>)
              ? ((errBody.error as Record<string, unknown>).message as string)
              : undefined;
          msg =
            nested ??
            (typeof errBody.message === "string" ? errBody.message : undefined) ??
            (typeof errBody.error === "string" ? errBody.error : undefined) ??
            msg;
        } catch {
          // body wasn't JSON, use status text
          msg = `Execution failed (${res.status})`;
        }
        setExecutionError(msg);
        setPhase("error");
        executeInFlightRef.current = false;
        return { success: false, status: "failed", error: msg };
      }
      // Parse and validate response to capture execution metadata
      const json: unknown = await res.json();
      const validated = ExecutorResponseSchema.safeParse(json);
      let executedCs: ChangeSet | undefined;
      if (validated.success) {
        executedCs = validated.data.changeSet as unknown as ChangeSet;
      } else {
        console.error("[workspace] Invalid executor response:", validated.error);
        // Fall back to applying all ops from the original changeset
      }
      const opsToApply = filterSuccessfulOps(
        cs.operations,
        executedCs?.execution?.results,
      );
      setProducts((prev) => applyDiffsToProducts(prev, opsToApply));
      // Update draft with execution metadata so history captures it
      if (executedCs) {
        setDraftChangeset(executedCs);
      }
      setPhase("complete");
      setTimeout(() => {
        setDraftChangeset(null);
        setPhase("idle");
        setExecutionError(null);
        executeInFlightRef.current = false;
      }, 2000);
      return { success: true, status: "executed" };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error — check your connection";
      setExecutionError(msg);
      setPhase("error");
      executeInFlightRef.current = false;
      return { success: false, status: "failed", error: msg };
    }
  }, [draftChangeset]);

  const cancelDraft = useCallback(() => {
    setDraftChangeset(null);
    setExecutionError(null);
    executeInFlightRef.current = false;
    setPhase("idle");
  }, []);

  const applyExecutedChangeset = useCallback((cs: ChangeSet) => {
    const opsToApply = filterSuccessfulOps(
      cs.operations,
      cs.execution?.results,
    );
    setProducts((prev) => applyDiffsToProducts(prev, opsToApply));
    // Normalize status — executor returns terminal status, but guard defensively
    const normalizedCs = cs.status === "executing"
      ? { ...cs, status: "completed" as const }
      : cs;
    appendTimelineEntry({
      changeset: normalizedCs,
      completedAt: new Date().toISOString(),
    });
  }, []);

  const reportChatActivity = useCallback(
    (p: ChatActivityPhase, changeset?: ChangeSet | null) => {
      setChatActivityPhase(p);
      setChatActivityChangeset(changeset ?? null);
    },
    [],
  );

  const ctx = useMemo<WorkspaceContextValue>(
    () => ({
      products,
      loading,
      fetchError,
      executionError,
      selectedIds,
      draftChangeset,
      phase,
      wsTemperature,
      wsEnergy,
      proactiveIssues,
      proactiveIssuesByTarget,
      select,
      multiSelect,
      deselectAll,
      submitIntent,
      submitIntentForProduct,
      executeChangeset,
      cancelDraft,
      retryFetch,
      applyExecutedChangeset,
      chatActivityPhase,
      chatActivityChangeset,
      reportChatActivity,
      changesetHistory,
      sessionStart,
    }),
    [
      products,
      loading,
      fetchError,
      executionError,
      selectedIds,
      draftChangeset,
      phase,
      wsTemperature,
      wsEnergy,
      proactiveIssues,
      proactiveIssuesByTarget,
      select,
      multiSelect,
      deselectAll,
      submitIntent,
      submitIntentForProduct,
      executeChangeset,
      cancelDraft,
      retryFetch,
      applyExecutedChangeset,
      chatActivityPhase,
      chatActivityChangeset,
      reportChatActivity,
      changesetHistory,
      sessionStart,
    ],
  );

  return (
    <WorkspaceContext.Provider value={ctx}>
      {children}
    </WorkspaceContext.Provider>
  );
}
