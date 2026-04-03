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
    "Promo Price": "$109.99",
    "Promo Active": "TRUE",
    Inventory: "450",
    "Image URL": "https://y3l8rbm69ww9fiju.public.blob.vercel-storage.com/products/str-001-vW5xPrRgYLvkbsU4UpmHOYAf8Vvcse.jpeg",
  },
  {
    SKU: "STR-002",
    Name: "Trail Blazer",
    Category: "Running",
    "Base Price": 149.99,
    "Promo Price": "",
    "Promo Active": "FALSE",
    Inventory: "280",
    "Image URL": "https://y3l8rbm69ww9fiju.public.blob.vercel-storage.com/products/str-002-0BCoCn9gzDl9tBRLtZi1k49nbcTb12.jpeg",
  },
  {
    SKU: "STR-003",
    Name: "Speed Elite",
    Category: "Running",
    "Base Price": 179.99,
    "Promo Price": "$159.99",
    "Promo Active": "TRUE",
    Inventory: "120",
    "Image URL": "https://y3l8rbm69ww9fiju.public.blob.vercel-storage.com/products/str-003-yHMRGAB7iu1JJ3HMOjXnkPuvu5ikuw.jpeg",
  },
  {
    SKU: "STR-004",
    Name: "Urban Walk",
    Category: "Lifestyle",
    "Base Price": 89.99,
    "Promo Price": "$74.99",
    "Promo Active": "TRUE",
    Inventory: "340",
    "Image URL": "https://y3l8rbm69ww9fiju.public.blob.vercel-storage.com/products/str-004-AGyOBkKWHeVgubhO7lgmnsdQjA8s9a.jpeg",
  },
  {
    SKU: "STR-005",
    Name: "Flex Training",
    Category: "Training",
    "Base Price": 109.99,
    "Promo Price": "$99.99",
    "Promo Active": "FALSE",
    Inventory: "200",
    "Image URL": "https://y3l8rbm69ww9fiju.public.blob.vercel-storage.com/products/str-005-US8Qck4jEXOOdH9gTuCUtE0uE1HBfn.jpeg",
  },
  {
    SKU: "STR-006",
    Name: "Marathon Pro",
    Category: "Running",
    "Base Price": 199.99,
    "Promo Price": "$169.99",
    "Promo Active": "TRUE",
    Inventory: "8",
    "Image URL": "https://y3l8rbm69ww9fiju.public.blob.vercel-storage.com/products/str-006-Z2F9lhJQ49t3RvLdozOgXdBAWXZQ3r.jpeg",
  },
  {
    SKU: "STR-007",
    Name: "Weekend Jogger",
    Category: "Lifestyle",
    "Base Price": 79.99,
    "Promo Price": "$69.99",
    "Promo Active": "TRUE",
    Inventory: "500",
    "Image URL": "https://y3l8rbm69ww9fiju.public.blob.vercel-storage.com/products/str-007-C55BYP4XvFhZz85iIAnmlBpNe9iMr7.jpeg",
  },
  {
    SKU: "STR-008",
    Name: "CrossFit Grip",
    Category: "Training",
    "Base Price": 139.99,
    "Promo Price": "",
    "Promo Active": "FALSE",
    Inventory: "150",
    "Image URL": "https://y3l8rbm69ww9fiju.public.blob.vercel-storage.com/products/str-008-l9QUnbTELdsjfiXNO8KhX0en7V0Hs6.jpeg",
  },
  {
    SKU: "STR-009",
    Name: "Performance Hoodie",
    Category: "Apparel",
    "Base Price": 89.99,
    "Promo Price": "$69.99",
    "Promo Active": "TRUE",
    Inventory: "75",
    "Image URL": "https://y3l8rbm69ww9fiju.public.blob.vercel-storage.com/products/str-009-XTVZykBFU5QCwbzlob3DJ5DnChcojG.jpeg",
  },
  {
    SKU: "STR-010",
    Name: "Gym Duffel",
    Category: "Accessories",
    "Base Price": 49.99,
    "Promo Price": "$39.99",
    "Promo Active": "TRUE",
    Inventory: "220",
    "Image URL": "https://y3l8rbm69ww9fiju.public.blob.vercel-storage.com/products/str-010-CFUxI5VvqTJBdAXwnJOy7M4ovZTTHF.jpeg",
  },
  {
    SKU: "STR-011",
    Name: "Compression Tights",
    Category: "Apparel",
    "Base Price": 64.99,
    "Promo Price": "$54.99",
    "Promo Active": "FALSE",
    Inventory: "5",
    "Image URL": "https://y3l8rbm69ww9fiju.public.blob.vercel-storage.com/products/str-011-X1WVAPd6MWjjbVjZKhDgo0tgas7uc5.jpeg",
  },
  {
    SKU: "STR-012",
    Name: "Training Socks 3-Pack",
    Category: "Accessories",
    "Base Price": 24.99,
    "Promo Price": "$19.99",
    "Promo Active": "TRUE",
    Inventory: "800",
    "Image URL": "https://y3l8rbm69ww9fiju.public.blob.vercel-storage.com/products/str-012-jOh10A5zNm6BKHblXXCVqMIFhqYCdJ.jpeg",
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
    "| SKU | Name | Category | Base Price | Promo Price | Promo Active | Inventory | Image URL |";
  const sep =
    "|-----|------|----------|-----------|-------------|--------------|-----------|-----------|";
  const rows = MOCK_PRODUCTS.map(
    (p) =>
      `| ${p.SKU} | ${p.Name} | ${p.Category} | $${p["Base Price"].toFixed(2)} | ${p["Promo Price"] || "—"} | ${p["Promo Active"]} | ${p.Inventory} | ${p["Image URL"]} |`
  );
  return [header, sep, ...rows].join("\n");
}
