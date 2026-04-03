/**
 * Mock data for the demo mode — products, launches, and session.
 *
 * Mirrors the Stride Athletics Google Sheets structure used in production.
 */

// ── Mock Auth0 session ─────────────────────────────────────────────

export const MOCK_SESSION = {
  user: {
    sub: "auth0|demo-user-001",
    name: "Demo User",
    email: "demo@stride-athletics.com",
    picture: "",
  },
  tokenSet: {
    accessToken: "mock-access-token",
    refreshToken: "mock-refresh-token",
    expiresIn: 3600,
  },
};

// ── Mock product catalog ────────────────────────────────────────────

export interface MockProduct {
  SKU: string;
  Name: string;
  Category: string;
  "Base Price": number;
  "Promo Price": string;
  "Promo Active": string;
  Inventory: string;
  "Image URL": string;
}

export const MOCK_PRODUCTS: MockProduct[] = [
  {
    SKU: "STR-001",
    Name: "Classic Runner",
    Category: "Running",
    "Base Price": 129.99,
    "Promo Price": "",
    "Promo Active": "FALSE",
    Inventory: "450",
    "Image URL": "",
  },
  {
    SKU: "STR-002",
    Name: "Trail Blazer",
    Category: "Running",
    "Base Price": 149.99,
    "Promo Price": "",
    "Promo Active": "FALSE",
    Inventory: "320",
    "Image URL": "",
  },
  {
    SKU: "STR-003",
    Name: "Speed Elite",
    Category: "Running",
    "Base Price": 179.99,
    "Promo Price": "",
    "Promo Active": "FALSE",
    Inventory: "185",
    "Image URL": "",
  },
  {
    SKU: "STR-004",
    Name: "Urban Walk",
    Category: "Lifestyle",
    "Base Price": 89.99,
    "Promo Price": "",
    "Promo Active": "FALSE",
    Inventory: "520",
    "Image URL": "",
  },
  {
    SKU: "STR-005",
    Name: "Flex Training",
    Category: "Training",
    "Base Price": 109.99,
    "Promo Price": "",
    "Promo Active": "FALSE",
    Inventory: "275",
    "Image URL": "",
  },
  {
    SKU: "STR-006",
    Name: "Marathon Pro",
    Category: "Running",
    "Base Price": 199.99,
    "Promo Price": "",
    "Promo Active": "FALSE",
    Inventory: "42",
    "Image URL": "",
  },
  {
    SKU: "STR-007",
    Name: "Weekend Jogger",
    Category: "Lifestyle",
    "Base Price": 79.99,
    "Promo Price": "",
    "Promo Active": "FALSE",
    Inventory: "610",
    "Image URL": "",
  },
  {
    SKU: "STR-008",
    Name: "CrossFit Grip",
    Category: "Training",
    "Base Price": 139.99,
    "Promo Price": "",
    "Promo Active": "FALSE",
    Inventory: "390",
    "Image URL": "",
  },
];

// ── Mock launch schedule ────────────────────────────────────────────

export interface MockLaunch {
  "Launch ID": string;
  Name: string;
  "Start Date": string;
  "End Date": string;
  Status: string;
  SKUs: string;
  "Discount %": number;
}

export const MOCK_LAUNCHES: MockLaunch[] = [
  {
    "Launch ID": "L001",
    Name: "Spring Sale 2026",
    "Start Date": "2026-04-10",
    "End Date": "2026-04-30",
    Status: "Upcoming",
    SKUs: "STR-001,STR-002,STR-003",
    "Discount %": 20,
  },
  {
    "Launch ID": "L002",
    Name: "Training Days",
    "Start Date": "2026-05-01",
    "End Date": "2026-05-15",
    Status: "Planned",
    SKUs: "STR-005,STR-008",
    "Discount %": 15,
  },
];

// ── Mock reader response (formatted product table) ──────────────────

export function buildMockReaderText(): string {
  const header =
    "| SKU | Name | Category | Base Price | Promo Price | Promo Active | Inventory |";
  const sep =
    "|-----|------|----------|-----------|-------------|--------------|-----------|";
  const rows = MOCK_PRODUCTS.map(
    (p) =>
      `| ${p.SKU} | ${p.Name} | ${p.Category} | $${p["Base Price"].toFixed(2)} | ${p["Promo Price"] || "—"} | ${p["Promo Active"]} | ${p.Inventory} |`
  );
  return [header, sep, ...rows].join("\n");
}
