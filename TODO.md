# TODO — Living Workspace

Extracted from [`docs/living-workspace-design-spec.md`](docs/living-workspace-design-spec.md).

> **Note:** Checked items reflect files that existed at time of extraction (2026-03-31). They have not been individually validated for correctness or completeness.

## Living Surface Foundation

- [x] Create `app/dashboard/workspace.tsx` — workspace component as default view alongside chat
- [x] Create `components/workspace/living-surface.tsx` — product tile grid with selection model
- [x] Create `components/workspace/product-tile.tsx` — individual tile with ambient indicators
- [x] Create `components/workspace/intent-bar.tsx` — voice-first command surface
- [x] Create `components/workspace/context-spine.tsx` — thin icon navigation rail
- [x] Create `components/workspace/workspace-provider.tsx` — React context for workspace state
- [x] Add ambient CSS to `app/globals.css` — workspace, product-tile, intent-bar, changeset-summary, inspector, and reduced-motion classes
- [x] Update `app/dashboard/dashboard-client.tsx` — add workspace as a view option alongside chat
- [x] Update `components/dashboard/layout-shell.tsx` — add `"workspace"` to `ActiveView` union

## Changeset Materialization

- [x] Create `components/workspace/changeset-overlay.tsx` — in-place diff overlays on product tiles
- [x] Create `components/workspace/changeset-summary.tsx` — floating summary panel with operation count, risk, and execute/cancel
- [ ] Adapt `components/changeset/diff-view.tsx` for tile-based overlays (strikethrough old values, glow new values on product tiles)
- [ ] Adapt `components/changeset/risk-badge.tsx` for tile-level risk indicators (inline dots replacing promo dots during draft state)

## Inspector & Timeline

- [x] Create `components/workspace/inspector-panel.tsx` — right panel with inline editing, price history sparkline, audit trail
- [x] Create `components/workspace/timeline-view.tsx` — horizontal changeset timeline with scrub-to-view
- [ ] Adapt `components/dashboard/agent-activity.tsx` for Context Spine Activity view

## Ambient Intelligence

- [x] Create `components/workspace/ambient-layer.tsx` — CSS background layer with temperature-driven color shifts
- [ ] Add proactive notification overlays on product tiles (reuse `lib/voice/proactive-insights.ts` for suggestions like "promo ends tomorrow, inventory still high")
- [ ] Add workspace breathing animations (pulse rhythm reflecting system health, disruption on errors)

## Chat as Secondary View

- [x] Keep `app/dashboard/chat.tsx` accessible via Context Spine icon
- [x] Chat serves as "transcript" mode for complex reasoning

## Verification

Owner: _unassigned_ | Last verified: _never_

- [ ] `npm run gates` passes with workspace components (lint + typecheck + build)
- [ ] Desktop: Product tiles render in workspace view, are selectable, Inspector opens on click
- [ ] Mobile: Tiles display as scrollable grid, tap opens bottom-sheet Inspector, long-press enters multi-select
- [ ] Voice: Mic on Intent Bar triggers voice flow, Living Surface responds with live preview of changes
- [ ] Changeset: In-place diff overlays appear on affected product tiles (strikethrough old price, glow new price, risk dots)
- [ ] Theme: Ambient color system works in both light and dark mode (temperature shifts, category hues, promo auras)
- [ ] Accessibility: Keyboard-navigable tiles (Tab/Space/Escape), reduced-motion respected, ARIA labels present
