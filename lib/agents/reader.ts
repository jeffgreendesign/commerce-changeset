/**
 * Reader Agent — read-only tools for Stride Athletics product catalog
 * and launch schedule data via Google Sheets + Token Vault OBO delegation.
 */

import { generateText, stepCountIs, tool, type Tool } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import {
  Auth0AI,
  getAccessTokenFromTokenVault,
} from "@auth0/ai-vercel";
import { z } from "zod/v4";

// ── Types ────────────────────────────────────────────────────────────

export interface ReaderAgentResult {
  text: string;
  toolCalls: Array<{ toolName: string; args: unknown }>;
  toolResults: Array<{ toolName: string; result: unknown }>;
}

interface SheetData {
  headers: string[];
  rows: string[][];
}

// ── Google Sheets helper ─────────────────────────────────────────────

function fetchSheet(range: string): Promise<SheetData> {
  const accessToken = getAccessTokenFromTokenVault();
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) {
    throw new Error("GOOGLE_SHEET_ID env var is not set");
  }

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}`;
  return fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  }).then(async (res) => {
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Google Sheets API ${res.status}: ${body}`);
    }
    const data: { values?: string[][] } = await res.json();
    const [headers, ...rows] = data.values ?? [];
    return { headers: headers ?? [], rows };
  });
}

/** Convert sheet rows to an array of keyed objects using the header row. */
function rowsToObjects(
  headers: string[],
  rows: string[][]
): Record<string, string>[] {
  return rows.map((row) =>
    Object.fromEntries(headers.map((h, i) => [h, row[i] ?? ""]))
  );
}

// ── Tool builder ─────────────────────────────────────────────────────
// Auth0AI is lazy-init (Zod validates client config at instantiation,
// crashing during Next.js build when env vars aren't set).
// Tools are built per-request so the refreshToken callback captures
// the current request's session token.

let auth0AI: Auth0AI;

function buildReaderTools(refreshToken: string): Record<string, Tool> {
  if (!auth0AI) {
    auth0AI = new Auth0AI();
  }

  const withGoogleToken = auth0AI.withTokenVault({
    connection: "google-oauth2",
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    refreshToken: async () => refreshToken,
  });

  return {
    get_products: withGoogleToken(
      tool({
        description:
          "Fetch all products from the Products sheet (SKU, Name, Category, Base Price, Promo Price, Promo Active, Inventory)",
        inputSchema: z.object({}),
        execute: async () => {
          const { headers, rows } = await fetchSheet("Products");
          return { products: rowsToObjects(headers, rows) };
        },
      })
    ),

    get_pricing: withGoogleToken(
      tool({
        description:
          "Fetch pricing data (Base Price, Promo Price, Promo Active) for specific SKUs",
        inputSchema: z.object({
          skus: z
            .array(z.string())
            .describe("List of SKU identifiers to look up"),
        }),
        execute: async ({ skus }) => {
          const { headers, rows } = await fetchSheet("Products");
          const skuIdx = headers.indexOf("SKU");
          const filtered = rows.filter((r) => skus.includes(r[skuIdx] ?? ""));
          const pricingHeaders = [
            "SKU",
            "Name",
            "Base Price",
            "Promo Price",
            "Promo Active",
          ];
          const pricingIdx = pricingHeaders.map((h) => headers.indexOf(h));
          return {
            pricing: filtered.map((row) =>
              Object.fromEntries(
                pricingHeaders.map((h, i) => [h, row[pricingIdx[i]] ?? ""])
              )
            ),
          };
        },
      })
    ),

    get_launch_schedule: withGoogleToken(
      tool({
        description:
          "Fetch the Launch Schedule sheet (Launch ID, Name, Start Date, End Date, Status, SKUs, Discount %)",
        inputSchema: z.object({}),
        execute: async () => {
          const { headers, rows } = await fetchSheet("Launch Schedule");
          return { launches: rowsToObjects(headers, rows) };
        },
      })
    ),

    get_launch_windows: withGoogleToken(
      tool({
        description:
          "Find available launch windows (dates without scheduling conflicts) within a date range",
        inputSchema: z.object({
          startDate: z
            .string()
            .describe("Range start as ISO date (YYYY-MM-DD)"),
          endDate: z.string().describe("Range end as ISO date (YYYY-MM-DD)"),
        }),
        execute: async ({ startDate, endDate }) => {
          const { headers, rows } = await fetchSheet("Launch Schedule");
          const launches = rowsToObjects(headers, rows);

          const rangeStart = new Date(startDate);
          const rangeEnd = new Date(endDate);

          const occupied = launches
            .filter((l) => l["Start Date"] && l["End Date"])
            .map((l) => ({
              start: new Date(l["Start Date"]),
              end: new Date(l["End Date"]),
              name: l["Name"] ?? "",
            }));

          const available: Array<{ date: string; dayOfWeek: string }> = [];
          const cursor = new Date(rangeStart);
          while (cursor <= rangeEnd) {
            const iso = cursor.toISOString().slice(0, 10);
            const isOccupied = occupied.some(
              (o) => cursor >= o.start && cursor <= o.end
            );
            if (!isOccupied) {
              available.push({
                date: iso,
                dayOfWeek: cursor.toLocaleDateString("en-US", {
                  weekday: "long",
                }),
              });
            }
            cursor.setDate(cursor.getDate() + 1);
          }

          return {
            availableWindows: available,
            conflicts: occupied.map((o) => ({
              name: o.name,
              start: o.start.toISOString().slice(0, 10),
              end: o.end.toISOString().slice(0, 10),
            })),
          };
        },
      })
    ),
  };
}

// ── Agent runner ─────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a commerce data assistant for Stride Athletics. You have access to product catalog and launch schedule data stored in Google Sheets.

Use the available tools to answer questions about products, pricing, inventory, and launch schedules. Always use tools to fetch data — never make up product information.

When presenting data, format it clearly. If the user asks about pricing, include both base and promo prices. If asked about launches, include dates and status.`;

export async function runReaderAgent(
  message: string,
  refreshToken: string
): Promise<ReaderAgentResult> {
  const anthropic = createAnthropic();
  const tools = buildReaderTools(refreshToken);

  console.log(`[reader] Starting — prompt: "${message.slice(0, 80)}${message.length > 80 ? "..." : ""}"`);
  const readerStart = performance.now();

  const result = await generateText({
    model: anthropic("claude-sonnet-4-20250514"),
    tools,
    system: SYSTEM_PROMPT,
    prompt: message,
    stopWhen: stepCountIs(10),
  });

  const toolNames = result.steps.flatMap((step) => step.toolCalls.map((tc) => tc.toolName));
  console.log(`[reader] Completed in ${Math.round(performance.now() - readerStart)}ms — ${toolNames.length} tool calls: ${toolNames.join(", ")}`);

  return {
    text: result.text,
    toolCalls: result.steps.flatMap((step) =>
      step.toolCalls.map((tc) => ({
        toolName: tc.toolName,
        args: tc.input,
      }))
    ),
    toolResults: result.steps.flatMap((step) =>
      step.toolResults.map((tr) => ({
        toolName: tr.toolName,
        result: tr.output,
      }))
    ),
  };
}
