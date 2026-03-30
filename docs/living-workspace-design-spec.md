# Innovative AI Interface Design — "The Living Workspace"

## Context

The Commerce Changeset app currently uses a chat-first paradigm (text input at bottom, messages scroll up, inline cards) that is structurally identical to every AI chat app since 2022. Despite having good visual polish (glassmorphism, voice, workflow pipelines, risk badges), the *interaction skeleton* feels dated because the metaphor is borrowed, not native to the commerce domain.

**The core problem:** Chat is a generic container. Commerce operations are spatial, relational, and temporal — but the current UI flattens everything into a linear message stream.

**The goal:** Design and build a genuinely novel interface paradigm for 2027/2028 that replaces chat-as-primary with something commerce-native, buildable with Next.js + React + Tailwind.

---

## The Vision: "The Living Workspace"

### Core Metaphor: A Reactive Surface, Not a Conversation

Instead of chatting *about* products and prices, users **see and touch** their commerce world directly. The interface is a **living workspace** — a single responsive surface where commerce objects (products, promos, prices) exist as tangible entities that users can select, gesture on, and transform.

**The AI is not a chatbot you talk to. It's an intelligence that permeates the surface itself.** When you grab a price and drag it down, the AI understands the intent, evaluates risk, and shows consequences in real-time — no typing required.

### What Makes This Novel

1. **No primary chat box.** Voice and a minimal command line exist as secondary inputs, but the default interaction is direct manipulation of commerce objects on the workspace surface.
2. **Objects, not messages.** Products, prices, promos, and changesets are first-class visual entities with physics-like behaviors (gravity toward related items, magnetism for bulk operations, resistance indicating risk).
3. **Intent inference from gesture.** Dragging a price down = discount. Selecting multiple SKUs and pinching = bulk operation. Long-press = inspect. The AI interprets spatial gestures as commerce intent.
4. **The surface breathes.** Ambient data visualization — subtle color shifts, particle flows, pulse rhythms — reflect the health and activity of the commerce system without demanding attention.
5. **Changesets materialize as spatial diffs.** Instead of cards in a chat stream, a changeset appears as a transformation overlay on the affected objects — you see the before/after *in place*, not described in text.

---

## Layout & Key Components

### Desktop Layout (3 zones)

```
┌─────────────────────────────────────────────────────┐
│  Ambient Header (minimal: logo, session pulse, auth) │
├───────────┬─────────────────────────┬───────────────┤
│           │                         │               │
│  Context  │    The Living Surface   │   Inspector   │
│   Spine   │                         │   (appears    │
│           │  [Product tiles float   │   on select)  │
│  (thin,   │   as interactive cards  │               │
│  icon-    │   arranged spatially]   │               │
│  based)   │                         │               │
│           │  [Promo timeline at     │               │
│           │   bottom edge]          │               │
│           │                         │               │
│           │  [Changeset overlays    │               │
│           │   materialize in-place] │               │
│           │                         │               │
├───────────┴─────────────────────────┴───────────────┤
│  Intent Bar (voice-first, with inline text fallback) │
└─────────────────────────────────────────────────────┘
```

### Mobile Layout (stacked)

```
┌─────────────────────┐
│ Ambient Header      │
├─────────────────────┤
│                     │
│  Living Surface     │
│  (scrollable grid   │
│   of product tiles) │
│                     │
│  [Tap = select]     │
│  [Swipe = action]   │
│  [Long press =      │
│   inspect]          │
│                     │
├─────────────────────┤
│ Intent Bar          │
│ (voice + text)      │
└─────────────────────┘
```

### Component Breakdown

#### 1. The Living Surface (`components/workspace/living-surface.tsx`)
- **Product Tiles**: Not cards in a list — floating, draggable tiles with live data (price, inventory count, promo status as colored aura)
- **Spatial Arrangement**: Products arranged by category clusters. AI can re-arrange based on context (e.g., "show me everything on promo" causes promo items to drift to center)
- **Selection Model**: Tap/click to select. Multi-select with modifier key or lasso gesture. Selection triggers the Inspector.
- **Ambient Indicators**: Subtle glow = active promo. Pulse = recent change. Red tint = risk detected.

#### 2. The Intent Bar (`components/workspace/intent-bar.tsx`)
- **NOT a chat input.** A slim, context-aware command surface at the bottom.
- **Voice-first**: Large mic button. Tap to speak naturally: "Discount everything in footwear by 20%"
- **Smart text input**: When typing, shows contextual suggestions based on current selection. If 3 products are selected, suggestions include "Change price", "Toggle promo", "Compare".
- **Inline previews**: As you type/speak, the surface shows a *live preview* of what would change — prices shimmer to new values, risk indicators appear — BEFORE you confirm.
- **No message history in the bar.** History lives in a collapsible timeline, not a scrolling chat.

#### 3. Changeset Materialization (`components/workspace/changeset-overlay.tsx`)
- When a changeset is created, it doesn't appear as a card in a message stream.
- Instead, **affected product tiles transform**: a translucent overlay shows the diff (old price fading out, new price fading in). Risk badges appear directly on the tiles.
- A **floating changeset summary** appears as a compact, draggable panel showing: operation count, aggregate risk, approve/execute buttons.
- The CIBA approval gate appears as a **full-surface frosted overlay** with biometric prompt — the entire workspace pauses until approval.

#### 4. The Context Spine (`components/workspace/context-spine.tsx`)
- Replaces the left rail. Ultra-thin (48px), icon-only.
- Icons: Catalog (grid), Timeline (clock), Drafts (layers), Activity (pulse), Settings (gear).
- **Catalog**: Shows the living surface (default).
- **Timeline**: Horizontal timeline of all changesets — scroll through time to see the state of commerce at any point. Scrubbing the timeline updates the surface.
- **Drafts**: Pending changesets as stacked layers you can toggle on/off like Photoshop layers.
- **Activity**: Agent activity stream (what the AI is doing right now).

#### 5. The Inspector (`components/workspace/inspector.tsx`)
- Slides in from right when any object is selected.
- Shows deep detail: full product data, price history sparkline, related promos, risk analysis, audit trail.
- **Inline editing**: Fields are directly editable. Change a price → AI instantly evaluates risk and shows the changeset preview on the surface.
- Replaces the current chat-embedded changeset cards with a dedicated, persistent detail view.

#### 6. Ambient Data Layer (`components/workspace/ambient-layer.tsx`)
- A CSS-only (or lightweight canvas) background layer beneath the product tiles.
- **Color temperature**: Shifts from cool blue (everything normal) to warm amber (changes pending) to active green (executing).
- **Particle flow**: Optional subtle particles that flow between related objects (e.g., products in the same promo campaign have a connecting stream).
- **Pulse rhythm**: The workspace has a subtle "heartbeat" — a barely-perceptible brightness oscillation that reflects system health. Disruptions (errors, high risk) change the rhythm.

---

## Interaction Patterns

### Pattern 1: Direct Price Change (No Typing)
1. User taps a product tile → Inspector opens with price field
2. User taps price → inline numeric input appears
3. User types new price → surface shows live diff overlay (old price fading, new price glowing)
4. Risk badge appears on tile in real-time as policy engine evaluates
5. User taps "Apply" → changeset materializes → approval flow if needed

### Pattern 2: Voice-Driven Bulk Operation
1. User taps mic on Intent Bar
2. Says: "Set a 20% discount on all footwear"
3. Surface responds: footwear tiles highlight, shimmer to new prices, risk indicators appear
4. A floating changeset summary materializes with "3 products, Moderate risk"
5. User taps "Execute" on the summary panel

### Pattern 3: Exploratory / Ambient
1. User opens Timeline view on Context Spine
2. Scrubs back to last week → surface updates to show the state of all products at that time
3. Taps "Compare to now" → split-diff overlay appears on each changed tile
4. Notices an anomaly → taps affected product → Inspector shows full history + AI analysis

### Pattern 4: The Workspace Notices Things (Proactive)
1. The ambient layer shifts slightly warmer — a product tile begins pulsing
2. User notices and taps it → Inspector shows: "This product's promo ends tomorrow but inventory is still high. Suggested: extend promo 7 days."
3. User taps "Apply suggestion" → changeset materializes inline

---

## Styling Approach: Beyond Tailwind Defaults

### Custom Design System (Not "shadcn look")
- **No visible borders or shadows on cards.** Tiles are differentiated by subtle background opacity and hover-state luminance shifts.
- **Typography as hierarchy.** Large, bold prices. Whisper-quiet labels. No badges for things that can be shown with color or position.
- **Oklch color as data.** Hue = category. Lightness = inventory level. Chroma = promo intensity. Color IS information, not decoration.
- **Motion as meaning.** Objects that are changing drift slightly. Stable objects are still. The workspace is calm when nothing is happening and visually alive when operations are in flight.
- **Custom CSS (in globals.css) over component library defaults.** Use Tailwind for utility but define a bespoke visual language with CSS custom properties, `@property` animations, and `color-mix()` for the ambient layer.

### Key CSS Techniques
- `@property` for animatable custom properties (ambient temperature, pulse rhythm)
- `color-mix(in oklch, ...)` for smooth data-driven color transitions
- CSS `anchor()` for spatial relationships between tiles and their overlays
- View Transitions API for changeset materialization
- `prefers-reduced-motion` respected throughout — ambient effects become static color indicators

---

## Detailed Wireframes

### Desktop: The Living Surface (Default State)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ◉ Commerce Changeset                          ◐ Session   ☀ ︎ jeff@stride.co │
├──┬───────────────────────────────────────────────────────────────────────────┤
│  │                                                                          │
│▦ │   FOOTWEAR                                                               │
│  │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                     │
│  │   │ ░░░░░░░░░░░ │  │ ░░░░░░░░░░░ │  │ ░░░░░░░░░░░ │                     │
│⏱ │   │  STR-001    │  │  STR-002    │  │  STR-003    │                     │
│  │   │  $89.99     │  │  $75.00     │  │  $120.00    │                     │
│  │   │  450 units  │  │  320 units  │  │  180 units  │                     │
│◎ │   │  ● promo    │  │             │  │  ● promo    │                     │
│  │   └─────────────┘  └─────────────┘  └─────────────┘                     │
│  │                                                                          │
│▤ │   ACCESSORIES                                                            │
│  │   ┌─────────────┐  ┌─────────────┐                                      │
│  │   │ ░░░░░░░░░░░ │  │ ░░░░░░░░░░░ │                                      │
│⚙ │   │  ACC-001    │  │  ACC-002    │                                      │
│  │   │  $29.99     │  │  $45.00     │                                      │
│  │   │  1200 units │  │  600 units  │                                      │
│  │   └─────────────┘  └─────────────┘                                      │
│  │                                                                          │
│  │   ── SPR-2026 Spring Promo ─── Mar 28 ████████░░░░ Apr 15 ──            │
│  │                                                                          │
├──┴───────────────────────────────────────────────────────────────────────────┤
│  🎤  Describe a change, or select products to act on...            ⌘K  Go  │
└──────────────────────────────────────────────────────────────────────────────┘

Legend:
  ▦ = Catalog (active)    ░░░ = Product image area
  ⏱ = Timeline            ● promo = Green dot = active promo
  ◎ = Drafts              ◐ = Session pulse dot
  ▤ = Activity
  ⚙ = Settings
```

### Desktop: Product Selected → Inspector Open

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ◉ Commerce Changeset                          ◐ Session   ☀ ︎ jeff@stride.co │
├──┬───────────────────────────────────────────────┬───────────────────────────┤
│  │                                               │                          │
│▦ │   FOOTWEAR                                    │  Classic Runner          │
│  │   ┌─────────────┐  ┌─────────────┐            │  STR-001 · Footwear     │
│  │   │▓▓▓▓▓▓▓▓▓▓▓▓▓│  │             │            │                          │
│⏱ │   │▓ STR-001  ▓▓│  │  STR-002    │            │  Price                   │
│  │   │▓ $89.99   ▓▓│  │  $75.00     │            │  ┌──────────────────┐    │
│  │   │▓ 450 unit ▓▓│  │  320 units  │            │  │ $89.99           │    │
│◎ │   │▓ ● promo  ▓▓│  │             │            │  └──────────────────┘    │
│  │   │▓▓▓▓▓▓▓▓▓▓▓▓▓│  └─────────────┘            │  ▁▂▃▅▆▅▃▂▁▂▃▅ (90d)    │
│  │                                               │                          │
│▤ │   ACCESSORIES                                 │  Inventory   450         │
│  │   ┌─────────────┐  ┌─────────────┐            │  Status      Active      │
│  │   │             │  │             │            │  Promo       SPR-2026 ●  │
│⚙ │   │  ACC-001    │  │  ACC-002    │            │                          │
│  │   │  $29.99     │  │  $45.00     │            │  Risk Analysis           │
│  │   └─────────────┘  └─────────────┘            │  No pending changes      │
│  │                                               │                          │
│  │   ── SPR-2026 ─── Mar 28 ████████░░ Apr 15 ──│  ─── Audit Trail ───     │
│  │                                               │  Mar 28  Price set $89.99│
├──┴───────────────────────────────────────────────┴───────────────────────────┤
│  🎤  Classic Runner selected · Change price / Toggle promo / Compare   Go   │
└──────────────────────────────────────────────────────────────────────────────┘

The ▓ border = selected tile (ring glow, not a box shadow)
Inspector slides in from right with spring animation
Intent Bar is now context-aware — shows actions relevant to selection
Price field in Inspector is directly editable (tap to edit)
Sparkline (▁▂▃▅▆▅▃▂▁▂▃▅) shows 90-day price history
```

### Desktop: Changeset Materialized (In-Place Diff)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ◉ Commerce Changeset                   ◐ 1 draft   ☀ ︎  jeff@stride.co      │
├──┬───────────────────────────────────────────────────────────────────────────┤
│  │                                                                          │
│▦ │   FOOTWEAR                                                               │
│  │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                     │
│  │   │ ░░░░░░░░░░░ │  │ ░░░░░░░░░░░ │  │ ░░░░░░░░░░░ │                     │
│⏱ │   │  STR-001    │  │  STR-002    │  │  STR-003    │                     │
│  │   │  $̶8̶9̶.̶9̶9̶     │  │  $̶7̶5̶.̶0̶0̶     │  │  $̶1̶2̶0̶.̶0̶0̶    │                     │
│  │   │  $71.99 ↓20%│  │  $60.00 ↓20%│  │  $96.00 ↓20%│                     │
│◎ │   │  450 units  │  │  320 units  │  │  180 units  │                     │
│  │   │  ●● moderate│  │  ●● moderate│  │  ●● moderate│                     │
│▤ │   └─────────────┘  └─────────────┘  └─────────────┘                     │
│  │                                                                          │
│⚙ │   ┌─ Changeset cs-7f3a ────────────────────────────────────────┐         │
│  │   │  "20% discount on all footwear"                            │         │
│  │   │  3 operations · ●● Moderate risk · No approval required    │         │
│  │   │                                     [Cancel]  [Execute ▶]  │         │
│  │   └────────────────────────────────────────────────────────────┘         │
│  │                                                                          │
│  │   ── SPR-2026 ─── Mar 28 ████████░░░░ Apr 15 ──                         │
├──┴───────────────────────────────────────────────────────────────────────────┤
│  🎤  3 products affected · Tap tile to inspect diff              ⌘K  Go    │
└──────────────────────────────────────────────────────────────────────────────┘

Key visual behaviors:
  - Old prices have strikethrough + fade to 40% opacity
  - New prices glow briefly, then settle (emerald tint)
  - ↓20% change magnitude badge appears inline
  - Risk dots replace promo dots during draft state
  - Floating changeset summary panel appears near affected area
  - Ambient background shifts from neutral to warm (pending changes)
```

### Mobile: Living Surface

```
┌────────────────────────┐
│ ≡  Commerce Changeset  │
│ ◐ Session  0 drafts    │
├────────────────────────┤
│                        │
│ FOOTWEAR          ▸    │
│ ┌──────┐ ┌──────┐     │
│ │      │ │      │     │
│ │STR-  │ │STR-  │     │
│ │001   │ │002   │     │
│ │$89.99│ │$75.00│     │
│ │450 u │ │320 u │     │
│ │ ●    │ │      │     │
│ └──────┘ └──────┘     │
│                        │
│ ACCESSORIES       ▸    │
│ ┌──────┐ ┌──────┐     │
│ │      │ │      │     │
│ │ACC-  │ │ACC-  │     │
│ │001   │ │002   │     │
│ │$29.99│ │$45   │     │
│ └──────┘ └──────┘     │
│                        │
│ ── SPR-2026 ████░░ ── │
│                        │
├────────────────────────┤
│ 🎤  Describe a change… │
│         [Go]           │
└────────────────────────┘

Touch gestures:
  Tap tile → bottom sheet Inspector
  Long press → multi-select mode
  Swipe right on tile → quick actions
  Pull down → refresh data
```

### Mobile: Inspector (Bottom Sheet)

```
┌────────────────────────┐
│ ≡  Commerce Changeset  │
│ ◐ Session              │
├────────────────────────┤
│ ┌──────┐ ┌──────┐     │
│ │▓▓▓▓▓▓│ │      │     │
│ │▓STR- ▓│ │STR-  │     │
│ │▓001  ▓│ │002   │     │
│ └──────┘ └──────┘     │
├────────────────────────┤  ← drag handle
│                        │
│  Classic Runner        │
│  STR-001 · Footwear    │
│                        │
│  Price    [$89.99    ] │
│  ▁▂▃▅▆▅▃▂▁ (90d)      │
│                        │
│  Inventory  450 units  │
│  Promo      SPR-2026 ● │
│                        │
│  [ Change Price ]      │
│  [ Toggle Promo ]      │
│                        │
├────────────────────────┤
│ 🎤  STR-001 selected   │
│         [Go]           │
└────────────────────────┘
```

---

## CSS Prototype: Ambient Color System

These CSS definitions extend `app/globals.css` to create the ambient, data-driven visual language. They build on the existing oklch color system and `@property` pattern already used for `--gradient-angle`.

```css
/* ── Workspace ambient tokens ─────────────────────────────────────── */

/* Animatable custom properties for the ambient layer */
@property --ws-temperature {
  syntax: "<number>";
  initial-value: 0;
  inherits: true;
}
@property --ws-pulse-speed {
  syntax: "<time>";
  initial-value: 4s;
  inherits: true;
}
@property --ws-energy {
  syntax: "<number>";
  initial-value: 0;
  inherits: true;
}

/*
  Temperature scale (set via JS on .workspace element):
    0   = neutral (no pending changes)
    0.5 = warm (changes drafted)
    1   = active (executing)

  Maps to:
    0   → background stays at --background
    0.5 → subtle amber tint
    1   → subtle emerald tint
*/

.workspace {
  --ws-bg: color-mix(
    in oklch,
    var(--background) calc(100% - var(--ws-temperature) * 8%),
    oklch(0.92 0.04 85) calc(var(--ws-temperature) * 8%)
  );
  background: var(--ws-bg);
  transition: --ws-temperature 1.2s ease-in-out;
}
.workspace[data-phase="executing"] {
  --ws-bg: color-mix(
    in oklch,
    var(--background) 94%,
    oklch(0.9 0.06 145) 6%
  );
}

:is(.dark) .workspace {
  --ws-bg: color-mix(
    in oklch,
    var(--background) calc(100% - var(--ws-temperature) * 5%),
    oklch(0.25 0.03 85) calc(var(--ws-temperature) * 5%)
  );
}

/* ── Workspace pulse (heartbeat) ──────────────────────────────────── */

@keyframes ws-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.97; }
}

.workspace {
  animation: ws-pulse var(--ws-pulse-speed) ease-in-out infinite;
}

/* Speed up pulse during execution */
.workspace[data-phase="executing"] {
  --ws-pulse-speed: 1.5s;
}
.workspace[data-phase="error"] {
  --ws-pulse-speed: 0.8s;
}

/* ── Product tile states ──────────────────────────────────────────── */

.product-tile {
  /* No borders, no shadows — differentiated by luminance */
  background: color-mix(in oklch, var(--card) 100%, transparent 0%);
  border-radius: var(--radius-xl);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

/* Hover: subtle luminance lift */
.product-tile:hover {
  background: color-mix(in oklch, var(--card) 100%, oklch(1 0 0) 4%);
}
:is(.dark) .product-tile:hover {
  background: color-mix(in oklch, var(--card) 100%, oklch(1 0 0) 6%);
}

/* Selected: ring glow (not box-shadow) */
.product-tile[data-selected="true"] {
  outline: 2px solid oklch(0.7 0.15 264);
  outline-offset: 2px;
}

/* Promo active: subtle category-hued aura */
.product-tile[data-promo="active"]::after {
  content: "";
  position: absolute;
  inset: -2px;
  border-radius: inherit;
  background: radial-gradient(
    ellipse at center,
    oklch(0.85 0.12 145 / 15%) 0%,
    transparent 70%
  );
  pointer-events: none;
  z-index: -1;
}

/* Recently changed: drift animation */
@keyframes tile-settle {
  0% { transform: translateY(-2px); }
  100% { transform: translateY(0); }
}
.product-tile[data-recently-changed="true"] {
  animation: tile-settle 0.6s ease-out;
}

/* ── Diff overlay on tiles ────────────────────────────────────────── */

.tile-diff-overlay {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  z-index: 10;
}

/* Old value: fade + strikethrough */
.tile-price-old {
  text-decoration: line-through;
  opacity: 0.4;
  transition: opacity 0.5s ease;
}

/* New value: glow entrance */
@keyframes price-materialize {
  0% {
    opacity: 0;
    filter: brightness(1.5) blur(2px);
  }
  100% {
    opacity: 1;
    filter: brightness(1) blur(0);
  }
}
.tile-price-new {
  animation: price-materialize 0.6s ease-out forwards;
  color: oklch(0.55 0.15 145);
}
:is(.dark) .tile-price-new {
  color: oklch(0.75 0.15 145);
}

/* Change magnitude badge */
.tile-change-badge {
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  padding: 0.125rem 0.375rem;
  border-radius: var(--radius-sm);
  background: oklch(0.95 0.04 145);
  color: oklch(0.4 0.12 145);
}
:is(.dark) .tile-change-badge {
  background: oklch(0.25 0.04 145);
  color: oklch(0.8 0.12 145);
}

/* ── Color-as-data: category hues ─────────────────────────────────── */

/*
  Each product category gets a distinct oklch hue.
  Used as a subtle tint on the tile, not a border or badge.
  Hue applied to a thin top-edge gradient, barely visible.
*/
.product-tile[data-category="footwear"] {
  --tile-hue: 264;  /* blue-violet */
}
.product-tile[data-category="accessories"] {
  --tile-hue: 45;   /* amber */
}
.product-tile[data-category="apparel"] {
  --tile-hue: 330;  /* pink */
}
.product-tile[data-category="equipment"] {
  --tile-hue: 145;  /* emerald */
}

.product-tile::before {
  content: "";
  position: absolute;
  top: 0;
  left: 10%;
  right: 10%;
  height: 2px;
  border-radius: 1px;
  background: oklch(0.7 0.1 var(--tile-hue) / 40%);
}

/* ── Changeset summary panel ──────────────────────────────────────── */

.changeset-summary {
  position: fixed;
  bottom: 5rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
}

@keyframes summary-materialize {
  0% {
    opacity: 0;
    transform: translateX(-50%) translateY(16px) scale(0.95);
  }
  100% {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
  }
}
.changeset-summary {
  animation: summary-materialize 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

/* ── Intent Bar ───────────────────────────────────────────────────── */

.intent-bar {
  --intent-bg: color-mix(in oklch, var(--background) 85%, transparent 15%);
  -webkit-backdrop-filter: blur(24px) saturate(2);
  backdrop-filter: blur(24px) saturate(2);
  background: var(--intent-bg);
}

/* Context-aware suggestions */
.intent-suggestion {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius);
  background: var(--muted);
  color: var(--muted-foreground);
  cursor: pointer;
  transition: background 0.15s;
}
.intent-suggestion:hover {
  background: var(--accent);
}

/* ── Promo timeline bar ───────────────────────────────────────────── */

.promo-timeline {
  height: 3px;
  border-radius: 1.5px;
  background: var(--muted);
  position: relative;
}
.promo-timeline-fill {
  height: 100%;
  border-radius: inherit;
  background: oklch(0.65 0.15 145);
  transition: width 0.5s ease;
}

/* ── Inspector slide-in ───────────────────────────────────────────── */

@keyframes inspector-enter {
  0% {
    opacity: 0;
    transform: translateX(24px);
  }
  100% {
    opacity: 1;
    transform: translateX(0);
  }
}
.inspector-panel {
  animation: inspector-enter 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  border-left: 1px solid var(--border);
}

/* ── Reduced motion overrides ─────────────────────────────────────── */

@media (prefers-reduced-motion: reduce) {
  .workspace {
    animation: none;
  }
  .product-tile[data-recently-changed="true"] {
    animation: none;
  }
  .tile-price-new {
    animation: none;
    opacity: 1;
    filter: none;
  }
  .changeset-summary {
    animation: none;
    opacity: 1;
    transform: translateX(-50%);
  }
  .inspector-panel {
    animation: none;
    opacity: 1;
    transform: none;
  }
  .workspace {
    transition: none;
  }
}
```

---

## Interaction Specification

### Selection Model

| Platform | Gesture | Result |
|----------|---------|--------|
| Desktop | Click tile | Select single, deselect others |
| Desktop | Cmd/Ctrl + Click | Toggle tile in multi-selection |
| Desktop | Shift + Click | Range select (by DOM order) |
| Desktop | Click empty space | Deselect all |
| Mobile | Tap tile | Select single → bottom sheet Inspector |
| Mobile | Long press tile | Enter multi-select mode (haptic feedback) |
| Mobile | Tap additional tiles (in multi-select) | Toggle selection |
| Mobile | Tap empty space | Exit multi-select |
| Both | Escape key | Deselect all, close Inspector |

### Intent Bar Context Awareness

| Selection State | Intent Bar Placeholder | Suggestion Chips |
|----------------|----------------------|------------------|
| Nothing selected | "Describe a change, or select products..." | Recent actions, trending |
| 1 product selected | "{Product name} selected" | Change price, Toggle promo, View history |
| N products selected | "{N} products selected" | Bulk price change, Compare, Export |
| Changeset drafted | "{N} products affected" | Execute, Modify, Cancel |
| Executing | "Executing..." | (disabled) |

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘K` | Focus Intent Bar (same as current) |
| `Escape` | Deselect / close Inspector / cancel draft |
| `⌘A` | Select all visible tiles |
| `⌘Z` | Undo last changeset (if not yet executed) |
| `Enter` | Execute drafted changeset |
| `Tab` | Cycle through tiles |
| `Space` | Toggle selection on focused tile |
| `1-5` | Switch Context Spine views |

### Changeset Lifecycle on the Surface

```
User action (voice/text/direct manipulation)
  ↓
Surface enters "preview" state:
  - Affected tiles show diff overlays (strikethrough old, glow new)
  - Ambient temperature shifts to 0.5 (warm)
  - Changeset summary panel materializes at bottom center
  - Intent Bar shows "N products affected"
  ↓
User taps "Execute" on summary panel:
  - If CIBA required: full-surface frosted overlay with approval prompt
  - Ambient temperature shifts to 1.0 (active/green)
  - Pulse speed increases
  - Each tile shows operation status (spinner → checkmark/X)
  ↓
Execution complete:
  - Tiles settle to new values (diff overlay fades, new price becomes permanent)
  - Ambient temperature returns to 0 (neutral)
  - Summary panel transforms to receipt (compact, dismissible)
  - Tile briefly flashes emerald on success
```

### Data Flow (React State)

```
WorkspaceProvider (context)
  ├── products: Product[]           ← from Reader API
  ├── selectedIds: Set<string>      ← user selection
  ├── draftChangeset: ChangeSet | null  ← from orchestrator
  ├── phase: "idle" | "preview" | "executing" | "complete" | "error"
  ├── wsTemperature: number         ← derived from phase
  └── actions:
      ├── select(id)
      ├── multiSelect(ids)
      ├── submitIntent(text)        ← voice/text → orchestrator API
      ├── executeChangeset()        ← execute API
      └── cancelDraft()
```

---

## Implementation Plan (Build Phases)

This is a design spec deliverable. The build phases below are for future reference when implementation begins.

### Phase 1: Living Surface Foundation (estimated ~15 files)
**New files:**
- `app/dashboard/workspace.tsx` — New workspace component (default view, alongside chat)
- `components/workspace/living-surface.tsx` — Product tile grid with selection model
- `components/workspace/product-tile.tsx` — Individual tile with ambient indicators
- `components/workspace/intent-bar.tsx` — Voice-first command surface
- `components/workspace/context-spine.tsx` — Thin icon navigation (replaces rail)
- `components/workspace/workspace-provider.tsx` — React context for workspace state

**Modify:**
- `app/globals.css` — Add all ambient CSS from prototype above
- `app/dashboard/dashboard-client.tsx` — Add workspace as a view option alongside chat
- `components/dashboard/layout-shell.tsx` — Add `"workspace"` to `ActiveView` union

**Reuse unchanged:**
- `lib/actions.ts` — Action definitions for intent inference
- `lib/policy/engine.ts` — Risk evaluation (real-time preview)
- `lib/changeset/builder.ts`, `lib/changeset/types.ts` — Core data model
- `lib/auth0.ts` — Auth unchanged
- `app/api/orchestrator/route.ts`, `app/api/reader/route.ts` — Backend unchanged

### Phase 2: Changeset Materialization (~5 files)
- `components/workspace/changeset-overlay.tsx` — In-place diff on tiles
- `components/workspace/changeset-summary.tsx` — Floating summary panel
- Adapt `components/changeset/diff-view.tsx` for tile overlays
- Adapt `components/changeset/risk-badge.tsx` for tile-level indicators

### Phase 3: Inspector & Timeline (~4 files)
- `components/workspace/inspector-panel.tsx` — Right panel with inline editing
- `components/workspace/timeline-view.tsx` — Horizontal changeset timeline
- Adapt `components/dashboard/agent-activity.tsx` for Context Spine

### Phase 4: Ambient Intelligence (~3 files)
- `components/workspace/ambient-layer.tsx` — CSS background layer
- Proactive notifications on tiles (reuse `lib/voice/proactive-insights.ts`)
- Workspace breathing animations

### Phase 5: Chat as Secondary View
- Keep `app/dashboard/chat.tsx` accessible via Context Spine icon
- Chat becomes "transcript" mode for complex reasoning

---

## Verification (When Built)

1. `npm run gates` passes (lint + typecheck + build)
2. Desktop: Product tiles render, are selectable, Inspector opens on click
3. Mobile: Tiles display as scrollable grid, tap/swipe interactions work
4. Voice: Mic triggers existing flow, surface responds with preview
5. Changeset: In-place diff overlays appear on affected tiles
6. Theme: Ambient color system works in light and dark mode
7. A11y: Keyboard-navigable, reduced-motion respected, ARIA labels present

---

## Key Insight for the User

**You asked: "Is it hard for an LLM to come up with something new that hasn't been thought of?"**

Yes — genuinely. LLMs recombine patterns from training data. But here's the nuance: *novelty in interface design almost always comes from recombination across domains*, not from thin air. The designers you admire (Bret Victor, Ink & Switch, tldraw) create "new" things by applying principles from physical manipulation, spatial cognition, and art to software problems nobody has combined them with before.

What I've proposed here combines:
- **Direct manipulation** (Bret Victor) → touch/click commerce objects directly
- **Ambient computing** (Google Research) → the workspace reflects system state through color and motion
- **Spatial cognition** (tldraw/Figma) → objects have position and relationship, not just list order
- **Malleable software** (Ink & Switch) → the surface reshapes based on what you're doing
- **Commerce-native metaphor** → prices, promos, and products are the UI primitives, not chat messages

No single piece is unprecedented. But this specific combination — applied to a commerce operations tool — hasn't been built. That's where the novelty lives.

**References (2025-2026):**

| Date | Source | What It Contributes |
|------|--------|---------------------|
| Jun 2025 | **Ink & Switch** — "Malleable Software: Restoring User Agency" (Litt, Horowitz, van Hardenberg, Matthews) | Manifesto for user-customizable software; AI-enabled adaptation at point of use. The philosophical foundation for the malleable surface concept. |
| Oct 2025 | **Geoffrey Litt** — "Code Like a Surgeon" | Human-AI collaboration model where users stay in the loop. Informs our "AI permeates the surface" approach vs. autonomous agent black box. |
| Apr 2025 | **Allen Pike** — "Post-Chat UI: How LLMs Are Making Traditional Apps Feel Broken" | Catalogs the limitations of chat-first interfaces. Argues chat should be a debug mode, not primary UX. Directly validates the problem this spec addresses. |
| Dec 2025 | **Google** — "A2UI: An Open Project for Agent-Driven Interfaces" (Apache 2.0) | Protocol for AI agents generating contextual UI in real-time. Informs the Intent Bar's context-aware suggestions and changeset materialization. |
| Mar 2025 | **tldraw** — "What's New" (Steve Ruiz) | tldraw.computer AI workflow app. Demonstrates canvas-as-platform paradigm with AI integration. Validates spatial arrangement as viable for AI tools. |
| Jun 2025 | **Apple** — visionOS 26 spatial design updates (WWDC 2025) | Spatial widgets integrating into physical space. Design principles for depth, luminance, and spatial hierarchy — applicable even on 2D screens. |
| May 2025 | **Bret Victor** — Keynote at The Screenless City Conference (MIT Media Lab) | Continued Dynamicland work on computational public space. Computing with hands and physical materials, not screens. Inspiration for direct manipulation. |
| May 2025 | **CHI 2025** — "Brickify: Enabling Expressive Design Intent through Direct Manipulation on Design Tokens" | Direct manipulation as core interaction pattern for AI-assisted design. Validates our tile-based, gestural approach. |
| May 2025 | **DIS 2025** — "Towards a Working Definition of Designing Generative User Interfaces" | Systematic study defining Generative UI through five core themes. Positions it as iterative, co-creative. Framework for our changeset materialization design. |
| 2025 | **Google Research** — "Generative UI: A Rich, Custom, Visual Interactive User Experience for Any Prompt" | Google's implementation of generative UI in Gemini. Shows how AI can create immersive, interactive experiences beyond text responses. |
| 2025 | **Nielsen Norman Group** — "Generative UI and Outcome-Oriented Design" | Designers shift from discrete element design to defining constraints for AI. UI becomes adaptive and context-aware. Validates our ambient, phase-driven approach. |
| 2025-2026 | **CopilotKit / AG-UI Protocol** — "The Developer's Guide to Generative UI in 2026" | Three patterns: Static, Declarative, Open-ended generative UI. AG-UI Protocol adopted by Google, LangChain, AWS. Practical framework for implementation. |
| May 2024 | **DirectGPT** — CHI '24 (Damien Masson et al.) | 50% faster editing, 72% shorter prompts with direct manipulation vs. chat. The empirical evidence that direct manipulation beats conversational UI for object-oriented tasks. |
| Apr 2026 | **CHI 2026** (Barcelona) — Multiple papers on agentic AI design patterns | "QuerySwitch" (balancing vagueness in LLM design), agentic AI for accessibility. Advancing human-AI interaction design. |

**Key earlier works that remain foundational:**
- Bret Victor: "Magic Ink: Information Software and the Graphical Interface" (2006) — the original argument against interface-as-conversation
- Dynamicland (ongoing) — computing in physical space, each program is a sheet of paper
