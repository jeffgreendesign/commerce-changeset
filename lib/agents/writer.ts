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
// E=Promo Price, F=Promo Active, G=Inventory

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

// ── Operation dispatch ───────────────────────────────────────────────

async function executeOperation(op: Operation): Promise<OperationResult> {
  const start = performance.now();
  try {
    const column = ACTION_COLUMN[op.action];
    if (!column) {
      throw new Error(`Unknown writer action: "${op.action}"`);
    }

    if (op.action === "bulk_price_change") {
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
