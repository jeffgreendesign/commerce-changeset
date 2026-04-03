import {
  DollarSignIcon,
  RocketIcon,
  TagIcon,
  SearchIcon,
  PackageIcon,
  BarChart3Icon,
  ZapIcon,
  SunriseIcon,
  HeartPulseIcon,
  XCircleIcon,
  ClipboardCheckIcon,
  ArrowDownUpIcon,
  CalendarCheckIcon,
  TrendingDownIcon,
  PlusCircleIcon,
  type LucideIcon,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────

export type AgentTag = "reader" | "writer" | "both";
export type RiskLevel = "safe" | "moderate" | "elevated";
export type ActionCategory =
  | "pricing"
  | "promos"
  | "inventory"
  | "analytics"
  | "campaigns"
  | "catalog";

export interface WorkflowStep {
  label: string;
  agent: "reader" | "writer";
}

export interface ActionDefinition {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  prompt: string;
  iconBg: string;
  iconColor: string;
  category: ActionCategory;
  agentTag: AgentTag;
  riskLevel: RiskLevel;
  workflowSteps: WorkflowStep[];
  featured?: boolean;
}

// ── Category metadata ────────────────────────────────────────────────

export interface RiskMeta {
  dots: number;
  color: string;
  label: string;
}

export const RISK_META: Record<RiskLevel, RiskMeta> = {
  safe: { dots: 1, color: "bg-emerald-500 text-emerald-500", label: "Safe" },
  moderate: { dots: 2, color: "bg-amber-500 text-amber-500", label: "Moderate" },
  elevated: { dots: 3, color: "bg-red-500 text-red-500", label: "Elevated" },
};

export const CATEGORY_META: Record<
  ActionCategory,
  { label: string; icon: LucideIcon; gradient: string }
> = {
  pricing: {
    label: "Pricing",
    icon: DollarSignIcon,
    gradient: "bg-gradient-to-br from-emerald-500 to-emerald-700",
  },
  promos: {
    label: "Promotions",
    icon: TagIcon,
    gradient: "bg-gradient-to-br from-amber-500 to-amber-700",
  },
  inventory: {
    label: "Inventory",
    icon: PackageIcon,
    gradient: "bg-gradient-to-br from-blue-500 to-blue-700",
  },
  analytics: {
    label: "Analytics & Reports",
    icon: BarChart3Icon,
    gradient: "bg-gradient-to-br from-violet-500 to-violet-700",
  },
  campaigns: {
    label: "Campaigns",
    icon: RocketIcon,
    gradient: "bg-gradient-to-br from-rose-500 to-rose-700",
  },
  catalog: {
    label: "Catalog",
    icon: PlusCircleIcon,
    gradient: "bg-gradient-to-br from-cyan-500 to-cyan-700",
  },
};

// ── Actions ──────────────────────────────────────────────────────────

export const ACTIONS: ActionDefinition[] = [
  // ── Catalog ──────────────────────────────────────────────────────
  {
    id: "create-product",
    icon: PlusCircleIcon,
    title: "Create Product",
    description: "Add a new product to the catalog",
    prompt:
      "Create a new product STR-010 Ultra Racer in the Running category with a base price of $149.99",
    iconBg: "bg-cyan-100 dark:bg-cyan-900/30",
    iconColor: "text-cyan-700 dark:text-cyan-400",
    category: "catalog",
    agentTag: "both",
    riskLevel: "moderate",
    workflowSteps: [
      { label: "Check for duplicate SKU", agent: "reader" },
      { label: "Validate product data", agent: "reader" },
      { label: "Append new product row", agent: "writer" },
    ],
    featured: true,
  },

  // ── Pricing ──────────────────────────────────────────────────────
  {
    id: "price-change",
    icon: DollarSignIcon,
    title: "Price Change",
    description: "Update pricing for any product",
    prompt: "Set a 20% discount on STR-001 Classic Runner",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
    iconColor: "text-emerald-700 dark:text-emerald-400",
    category: "pricing",
    agentTag: "both",
    riskLevel: "moderate",
    workflowSteps: [
      { label: "Fetch current price", agent: "reader" },
      { label: "Apply new price", agent: "writer" },
    ],
    featured: true,
  },
  {
    id: "bulk-price-change",
    icon: ArrowDownUpIcon,
    title: "Bulk Price Change",
    description: "Update prices across multiple products",
    prompt: "Apply a 15% discount to all running shoes",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
    iconColor: "text-emerald-700 dark:text-emerald-400",
    category: "pricing",
    agentTag: "both",
    riskLevel: "elevated",
    workflowSteps: [
      { label: "Scan catalog for matches", agent: "reader" },
      { label: "Calculate new prices", agent: "reader" },
      { label: "Apply batch update", agent: "writer" },
    ],
  },
  {
    id: "morning-price-check",
    icon: SunriseIcon,
    title: "Morning Price Audit",
    description: "Review all pricing and flag misalignment",
    prompt:
      "Show me current prices for all products and flag any that seem misaligned",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
    iconColor: "text-emerald-700 dark:text-emerald-400",
    category: "pricing",
    agentTag: "reader",
    riskLevel: "safe",
    workflowSteps: [
      { label: "Pull catalog pricing", agent: "reader" },
      { label: "Analyze price alignment", agent: "reader" },
    ],
  },
  {
    id: "margin-health",
    icon: HeartPulseIcon,
    title: "Margin Health Check",
    description: "Flag promos where discount exceeds thresholds",
    prompt:
      "Check margin health across all active promos — flag any where discount exceeds 30%",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
    iconColor: "text-emerald-700 dark:text-emerald-400",
    category: "pricing",
    agentTag: "reader",
    riskLevel: "safe",
    workflowSteps: [
      { label: "Fetch pricing + promo data", agent: "reader" },
      { label: "Calculate effective margins", agent: "reader" },
    ],
  },

  // ── Promotions ───────────────────────────────────────────────────
  {
    id: "launch-promo",
    icon: RocketIcon,
    title: "Launch Promo",
    description: "Activate a promo campaign",
    prompt: "Launch the spring promo for all Stride products",
    iconBg: "bg-amber-100 dark:bg-amber-900/30",
    iconColor: "text-amber-700 dark:text-amber-400",
    category: "promos",
    agentTag: "both",
    riskLevel: "elevated",
    workflowSteps: [
      { label: "Verify product eligibility", agent: "reader" },
      { label: "Activate promo status", agent: "writer" },
    ],
    featured: true,
  },
  {
    id: "toggle-promo",
    icon: TagIcon,
    title: "Toggle Promo",
    description: "Activate or deactivate promo status",
    prompt: "Set promo status to active for STR-002 Court Essential",
    iconBg: "bg-amber-100 dark:bg-amber-900/30",
    iconColor: "text-amber-700 dark:text-amber-400",
    category: "promos",
    agentTag: "writer",
    riskLevel: "moderate",
    workflowSteps: [
      { label: "Check current status", agent: "reader" },
      { label: "Toggle promo flag", agent: "writer" },
    ],
    featured: true,
  },
  {
    id: "flash-sale",
    icon: ZapIcon,
    title: "Flash Sale Setup",
    description: "Activate promo and set a time-limited discount",
    prompt:
      "Set up a flash sale: activate promo and set 25% discount on STR-003 Trail Blazer",
    iconBg: "bg-amber-100 dark:bg-amber-900/30",
    iconColor: "text-amber-700 dark:text-amber-400",
    category: "promos",
    agentTag: "both",
    riskLevel: "elevated",
    workflowSteps: [
      { label: "Read current state", agent: "reader" },
      { label: "Set promo price", agent: "writer" },
      { label: "Activate promo status", agent: "writer" },
    ],
  },
  {
    id: "campaign-wind-down",
    icon: XCircleIcon,
    title: "Campaign Wind-Down",
    description: "Deactivate all promos and restore base prices",
    prompt: "Deactivate all active promos and restore base prices",
    iconBg: "bg-amber-100 dark:bg-amber-900/30",
    iconColor: "text-amber-700 dark:text-amber-400",
    category: "promos",
    agentTag: "both",
    riskLevel: "elevated",
    workflowSteps: [
      { label: "Find active promos", agent: "reader" },
      { label: "Deactivate promos", agent: "writer" },
      { label: "Restore base prices", agent: "writer" },
    ],
  },

  // ── Inventory ────────────────────────────────────────────────────
  {
    id: "inventory-audit",
    icon: ClipboardCheckIcon,
    title: "Inventory Audit",
    description: "Check stock status across all products",
    prompt:
      "Run an inventory audit — which products have low stock or overstock flags?",
    iconBg: "bg-blue-100 dark:bg-blue-900/30",
    iconColor: "text-blue-700 dark:text-blue-400",
    category: "inventory",
    agentTag: "reader",
    riskLevel: "safe",
    workflowSteps: [
      { label: "Pull inventory flags", agent: "reader" },
      { label: "Summarize stock status", agent: "reader" },
    ],
  },
  {
    id: "update-stock",
    icon: PackageIcon,
    title: "Update Stock Flag",
    description: "Flag a product as low-stock or in-stock",
    prompt: "Update inventory flag for STR-001 Classic Runner to low_stock",
    iconBg: "bg-blue-100 dark:bg-blue-900/30",
    iconColor: "text-blue-700 dark:text-blue-400",
    category: "inventory",
    agentTag: "writer",
    riskLevel: "moderate",
    workflowSteps: [
      { label: "Check current flag", agent: "reader" },
      { label: "Set new flag", agent: "writer" },
    ],
  },

  // ── Analytics & Reports ──────────────────────────────────────────
  {
    id: "eod-review",
    icon: BarChart3Icon,
    title: "End-of-Day Review",
    description: "Promo status summary across the catalog",
    prompt:
      "Give me an end-of-day promo status review across the entire catalog",
    iconBg: "bg-violet-100 dark:bg-violet-900/30",
    iconColor: "text-violet-700 dark:text-violet-400",
    category: "analytics",
    agentTag: "reader",
    riskLevel: "safe",
    workflowSteps: [
      { label: "Pull all promo statuses", agent: "reader" },
      { label: "Compile summary report", agent: "reader" },
    ],
  },
  {
    id: "query-data",
    icon: SearchIcon,
    title: "Query Data",
    description: "Check current catalog state",
    prompt: "What are the current prices for all products?",
    iconBg: "bg-violet-100 dark:bg-violet-900/30",
    iconColor: "text-violet-700 dark:text-violet-400",
    category: "analytics",
    agentTag: "reader",
    riskLevel: "safe",
    workflowSteps: [
      { label: "Fetch requested data", agent: "reader" },
      { label: "Format response", agent: "reader" },
    ],
    featured: true,
  },

  // ── Campaigns ────────────────────────────────────────────────────
  {
    id: "launch-readiness",
    icon: CalendarCheckIcon,
    title: "Launch Readiness",
    description: "Pre-launch checklist for tomorrow's campaign",
    prompt:
      "Check if everything is set for tomorrow's launch — pricing, promo status, inventory",
    iconBg: "bg-rose-100 dark:bg-rose-900/30",
    iconColor: "text-rose-700 dark:text-rose-400",
    category: "campaigns",
    agentTag: "reader",
    riskLevel: "safe",
    workflowSteps: [
      { label: "Pull launch schedule", agent: "reader" },
      { label: "Cross-check pricing + status", agent: "reader" },
      { label: "Report readiness gaps", agent: "reader" },
    ],
  },
  {
    id: "seasonal-markdown",
    icon: TrendingDownIcon,
    title: "Seasonal Markdown",
    description: "Apply tiered markdowns across the catalog",
    prompt:
      "Apply a seasonal markdown cascade: 10% off all products, 20% off products already on promo",
    iconBg: "bg-rose-100 dark:bg-rose-900/30",
    iconColor: "text-rose-700 dark:text-rose-400",
    category: "campaigns",
    agentTag: "both",
    riskLevel: "elevated",
    workflowSteps: [
      { label: "Scan catalog + promo status", agent: "reader" },
      { label: "Calculate tiered discounts", agent: "reader" },
      { label: "Apply bulk price changes", agent: "writer" },
    ],
  },
  {
    id: "competitive-pricing",
    icon: SearchIcon,
    title: "Competitive Analysis",
    description: "Compare prices against market positioning",
    prompt:
      "Compare our current prices against standard market positioning for all products",
    iconBg: "bg-rose-100 dark:bg-rose-900/30",
    iconColor: "text-rose-700 dark:text-rose-400",
    category: "campaigns",
    agentTag: "reader",
    riskLevel: "safe",
    workflowSteps: [
      { label: "Fetch all product pricing", agent: "reader" },
      { label: "Analyze market positioning", agent: "reader" },
    ],
  },
];

// ── Derived exports ──────────────────────────────────────────────────

/** The original 4 actions shown on the idle chat screen. */
export const FEATURED_ACTIONS = ACTIONS.filter((a) => a.featured);

// ── Product-scoped & bulk actions for workspace CTAs ────────────────

export interface ProductAction {
  id: string;
  icon: LucideIcon;
  label: string;
  description: string;
  promptTemplate: string;
  category: ActionCategory;
  riskLevel: RiskLevel;
}

/** Actions available per-product via long-press. Template placeholders: {sku}, {name}, {price}. */
export const PRODUCT_ACTIONS: ProductAction[] = [
  {
    id: "price-change",
    icon: DollarSignIcon,
    label: "Change Price",
    description: "Set a new promo price",
    promptTemplate: "Set a 20% discount on {sku} {name}",
    category: "pricing",
    riskLevel: "moderate",
  },
  {
    id: "toggle-promo",
    icon: TagIcon,
    label: "Toggle Promo",
    description: "Activate or deactivate promo",
    promptTemplate: "Toggle promo status for {sku} {name}",
    category: "promos",
    riskLevel: "moderate",
  },
  {
    id: "flash-sale",
    icon: ZapIcon,
    label: "Flash Sale",
    description: "Activate promo + set discount",
    promptTemplate:
      "Set up a flash sale: activate promo and set 25% discount on {sku} {name}",
    category: "promos",
    riskLevel: "elevated",
  },
  {
    id: "update-stock",
    icon: PackageIcon,
    label: "Update Stock",
    description: "Change inventory flag",
    promptTemplate: "Update inventory flag for {sku} {name}",
    category: "inventory",
    riskLevel: "moderate",
  },
];

/** Bulk / global actions surfaced via the workspace FAB. */
export const BULK_ACTIONS: ActionDefinition[] = ACTIONS.filter((a) =>
  [
    "bulk-price-change",
    "launch-promo",
    "campaign-wind-down",
    "seasonal-markdown",
    "morning-price-check",
    "inventory-audit",
    "eod-review",
  ].includes(a.id),
);

/** Interpolate product details into a prompt template. */
export function interpolatePrompt(
  template: string,
  product: { sku: string; name: string; price: number },
): string {
  return template
    .replace(/\{sku\}/g, product.sku)
    .replace(/\{name\}/g, product.name)
    .replace(/\{price\}/g, `$${product.price.toFixed(2)}`);
}
