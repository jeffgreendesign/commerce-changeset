/**
 * Writer Agent — deterministic write tools for Stride Athletics product
 * catalog via Google Sheets + Token Vault OBO delegation.
 *
 * Unlike the Reader Agent, this is NOT an LLM agent. It loops over
 * approved operations and calls the matching write tool for each.
 */

import { tool } from "ai";
import {
  Auth0AI,
  getAccessTokenFromTokenVault,
} from "@auth0/ai-vercel";
import { z } from "zod/v4";

import type { Operation, OperationResult } from "@/lib/changeset/types";

// ── Types ────────────────────────────────────────────────────────────

export interface WriterAgentResult {
  results: OperationResult[];
  totalDuration: number;
}

// ── Column mapping ───────────────────────────────────────────────────
// Products sheet columns: A=SKU, B=Name, C=Category, D=Base Price,
// E=Promo Price, F=Promo Active, G=Inventory, H=Image URL

const ACTION_COLUMN: Record<string, string> = {
  update_price: "E",
  set_promo_status: "F",
  update_inventory_flag: "G",
  bulk_price_change: "E",
};

// ── Google Sheets helpers ────────────────────────────────────────────

function getSheetId(): string {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) {
    throw new Error("GOOGLE_SHEET_ID env var is not set");
  }
  return sheetId;
}

/** Read a range from the sheet (used for SKU row lookup). */
async function fetchSheet(range: string): Promise<string[][]> {
  const accessToken = getAccessTokenFromTokenVault();
  const sheetId = getSheetId();
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google Sheets API GET ${res.status}: ${body}`);
  }
  const data: { values?: string[][] } = await res.json();
  return data.values ?? [];
}

/** Write a single value to a cell via the Sheets values.update API. */
async function updateSheet(range: string, value: string): Promise<void> {
  const accessToken = getAccessTokenFromTokenVault();
  const sheetId = getSheetId();
  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}` +
    `?valueInputOption=USER_ENTERED`;

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ range, values: [[value]] }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google Sheets API PUT ${res.status}: ${body}`);
  }
}

/** Append a row to a sheet via the Sheets values.append API. */
async function appendSheet(range: string, row: (string | number | boolean)[]): Promise<void> {
  const accessToken = getAccessTokenFromTokenVault();
  const sheetId = getSheetId();
  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}:append` +
    `?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ range, values: [row] }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google Sheets API APPEND ${res.status}: ${body}`);
  }
}

// ── SKU helpers ──────────────────────────────────────────────────────

/** Extract SKU prefix (e.g. "STR-001") from an operation target like "STR-001 Classic Runner". */
function extractSku(target: string): string {
  const match = target.match(/^(STR-\d{3})/);
  if (!match) {
    throw new Error(`Cannot extract SKU from target: "${target}"`);
  }
  return match[1];
}

/** Look up the 1-indexed sheet row number for a given SKU. */
async function lookupSkuRow(sku: string): Promise<number> {
  const rows = await fetchSheet("Products!A:A");
  // rows[0] is the header row; data starts at rows[1]
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === sku) {
      return i + 1; // 1-indexed sheet row
    }
  }
  throw new Error(`SKU "${sku}" not found in Products sheet`);
}

/** Check whether a SKU already exists in the Products sheet (non-throwing). */
async function skuExists(sku: string): Promise<boolean> {
  const rows = await fetchSheet("Products!A:A");
  return rows.some((row, i) => i > 0 && row[0] === sku);
}

// ── Validation helpers ──────────────────────────────────────────────

/** Validate SKU format (STR-NNN). */
function validateSkuFormat(sku: string): void {
  if (!/^STR-\d{3}$/.test(sku)) {
    throw new Error(`Invalid SKU format "${sku}". Expected STR-NNN (e.g., STR-010).`);
  }
}

/** Validate a price value is a finite non-negative number. */
function validatePrice(value: string | number | boolean, label: string): void {
  if (typeof value === "boolean") {
    throw new Error(`Invalid ${label}: "${value}". Must be a non-negative number, not a boolean.`);
  }
  const num = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(num) || num < 0) {
    throw new Error(`Invalid ${label}: "${value}". Must be a non-negative number.`);
  }
}

/** Validate promo status is TRUE or FALSE. */
function validatePromoStatus(value: string): void {
  const upper = value.toUpperCase();
  if (upper !== "TRUE" && upper !== "FALSE") {
    throw new Error(`Invalid Promo Active value: "${value}". Must be TRUE or FALSE.`);
  }
}

/** Validate inventory flag is a known status. */
const VALID_INVENTORY_FLAGS = ["in_stock", "low_stock", "out_of_stock", "discontinued", "pre_order"];
function validateInventoryFlag(value: string): void {
  if (!VALID_INVENTORY_FLAGS.includes(value.toLowerCase())) {
    throw new Error(
      `Invalid inventory flag: "${value}". Allowed values: ${VALID_INVENTORY_FLAGS.join(", ")}.`
    );
  }
}

/**
 * Escape a string value to prevent formula injection in Google Sheets.
 * USER_ENTERED mode interprets leading =, +, -, @, tab, CR, LF as formulas.
 * Prefixing with a single quote forces Sheets to treat the cell as plain text.
 */
function escapeSheetValue(value: string): string {
  if (value.length > 0 && /^[=+\-@\t\r\n]/.test(value)) {
    return `'${value}`;
  }
  return value;
}

const ALLOWED_PRODUCT_FIELDS = new Set([
  "SKU", "Name", "Category", "Base Price", "Promo Price", "Promo Active", "Inventory", "Image URL",
]);

// ── Operation dispatch ───────────────────────────────────────────────

async function executeOperation(op: Operation): Promise<OperationResult> {
  const start = performance.now();
  try {
    // ── create_product: append a new row ────────────────────────────
    if (op.action === "create_product") {
      // Reject unknown diff fields
      for (const d of op.diff) {
        if (!ALLOWED_PRODUCT_FIELDS.has(d.field)) {
          throw new Error(`Unknown product field in create_product diff: "${d.field}". Allowed: ${[...ALLOWED_PRODUCT_FIELDS].join(", ")}.`);
        }
      }

      const fieldMap = Object.fromEntries(op.diff.map((d) => [d.field, d.after]));
      const sku = String(fieldMap["SKU"] ?? "");
      const name = String(fieldMap["Name"] ?? "");
      const category = String(fieldMap["Category"] ?? "");
      const basePrice = String(fieldMap["Base Price"] ?? "");
      const promoPrice = String(fieldMap["Promo Price"] ?? "");
      // Normalize blank optionals to defaults (empty string is not nullish, so ?? doesn't catch it)
      const promoActive = String(fieldMap["Promo Active"] ?? "FALSE") || "FALSE";
      const inventory = String(fieldMap["Inventory"] ?? "in_stock") || "in_stock";
      const imageUrl = String(fieldMap["Image URL"] ?? "");

      // Guardrails
      if (!sku || !name || !category || !basePrice) {
        throw new Error("create_product requires SKU, Name, Category, and Base Price.");
      }
      validateSkuFormat(sku);
      validatePrice(basePrice, "Base Price");
      if (Number(basePrice) <= 0) {
        throw new Error(`Base Price must be greater than 0. Got: ${basePrice}`);
      }
      if (promoPrice !== "") validatePrice(promoPrice, "Promo Price");
      validatePromoStatus(promoActive);
      validateInventoryFlag(inventory);

      // Duplicate check (live, not cached).
      // Note: this check-then-append is not atomic (TOCTOU). In practice the race
      // window is negligible: requests are single-user-per-session and serialized
      // through the CIBA approval gate (120s block). The orchestrator LLM also
      // pre-checks for duplicates against reader data before generating the op.
      if (await skuExists(sku)) {
        throw new Error(`SKU "${sku}" already exists in the Products sheet. Cannot create duplicate.`);
      }

      // Sanitize free-text fields against formula injection (USER_ENTERED mode)
      await appendSheet("Products!A:H", [
        escapeSheetValue(sku),
        escapeSheetValue(name),
        escapeSheetValue(category),
        escapeSheetValue(basePrice),
        escapeSheetValue(promoPrice),
        escapeSheetValue(promoActive),
        escapeSheetValue(inventory),
        escapeSheetValue(imageUrl),
      ]);
      console.log(`[writer] ✓ create_product ${sku} "${name}" appended in ${Math.round(performance.now() - start)}ms`);
      return { operationId: op.id, status: "success", duration: performance.now() - start };
    }

    // ── Existing update actions ─────────────────────────────────────
    const column = ACTION_COLUMN[op.action];
    if (!column) {
      throw new Error(`Unknown writer action: "${op.action}"`);
    }

    if (op.action === "bulk_price_change") {
      // Validate all prices before writing any
      for (const diff of op.diff) {
        validatePrice(diff.after, `Promo Price in "${diff.field}"`);
      }
      // Bulk operation: each diff encodes SKU in field "Promo Price (STR-001)"
      for (const diff of op.diff) {
        const skuMatch = diff.field.match(/\((STR-\d{3})\)/);
        if (!skuMatch) {
          throw new Error(`Cannot extract SKU from bulk diff field: "${diff.field}"`);
        }
        const row = await lookupSkuRow(skuMatch[1]);
        await updateSheet(`Products!${column}${row}`, String(diff.after));
        console.log(`[writer] ✓ bulk_price_change ${skuMatch[1]} (row ${row}, col ${column}) = "${diff.after}"`);
      }
      console.log(`[writer] ✓ bulk_price_change on ${op.target} — ${op.diff.length} updates in ${Math.round(performance.now() - start)}ms`);
      return {
        operationId: op.id,
        status: "success",
        duration: performance.now() - start,
      };
    }

    // Single-record operations
    const sku = extractSku(op.target);
    const row = await lookupSkuRow(sku);

    const diff = op.diff[0];
    if (!diff) {
      throw new Error(`Operation ${op.id} has no diff entries`);
    }

    // Per-action validation guardrails
    if (op.action === "update_price") {
      validatePrice(diff.after, "Promo Price");
    } else if (op.action === "set_promo_status") {
      validatePromoStatus(String(diff.after));
    } else if (op.action === "update_inventory_flag") {
      validateInventoryFlag(String(diff.after));
    }

    let value: string;
    if (op.action === "set_promo_status") {
      value = String(diff.after).toUpperCase();
    } else {
      value = String(diff.after);
    }

    await updateSheet(`Products!${column}${row}`, value);

    console.log(`[writer] ✓ ${op.action} on ${op.target} (row ${row}, col ${column}) = "${value}" in ${Math.round(performance.now() - start)}ms`);
    return {
      operationId: op.id,
      status: "success",
      duration: performance.now() - start,
    };
  } catch (err) {
    console.error(`[writer] Operation ${op.id} failed (${op.action} on ${op.target}):`, err instanceof Error ? err.message : err);
    return {
      operationId: op.id,
      status: "failure",
      error: err instanceof Error ? err.message : String(err),
      duration: performance.now() - start,
    };
  }
}

// ── Agent runner ─────────────────────────────────────────────────────
// Auth0AI is lazy-init (same pattern as reader.ts).
// A single tool is created and manually invoked so that the Token Vault
// async context is established for getAccessTokenFromTokenVault().

let auth0AI: Auth0AI;

export async function runWriterAgent(
  operations: Operation[],
  refreshToken: string
): Promise<WriterAgentResult> {
  if (!auth0AI) {
    auth0AI = new Auth0AI();
  }

  const withGoogleToken = auth0AI.withTokenVault({
    connection: "google-oauth2",
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    refreshToken: async () => refreshToken,
  });

  const writerTool = withGoogleToken(
    tool({
      description: "Execute all writer operations against Google Sheets",
      inputSchema: z.object({}),
      execute: async () => {
        const results: OperationResult[] = [];
        for (const op of operations) {
          results.push(await executeOperation(op));
        }
        return { results };
      },
    })
  );

  console.log(`[writer] Starting ${operations.length} operations`);
  const start = performance.now();

  // Manually invoke the wrapped tool (same pattern as CIBA spike).
  // The wrapper replaces execute with protect(), which expects (input, ctx).
  const execute = writerTool.execute as (
    input: Record<string, never>,
    ctx: { toolCallId: string; messages: unknown[] }
  ) => Promise<{ results: OperationResult[] }>;

  const { results } = await execute(
    {} as Record<string, never>,
    { toolCallId: `writer-${crypto.randomUUID()}`, messages: [] }
  );

  const succeeded = results.filter((r) => r.status === "success").length;
  console.log(`[writer] Done — ${succeeded}/${results.length} succeeded in ${Math.round(performance.now() - start)}ms`);

  return {
    results,
    totalDuration: performance.now() - start,
  };
}
