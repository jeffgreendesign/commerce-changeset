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

## Persistent Voice Agent

Goal: Keep the voice agent session alive across view navigation so users can continue a voice conversation while switching between Chat, Workspace, Actions, etc. The voice agent should also be able to navigate the app programmatically when executing commands.

### Production

- [ ] Create `VoiceProvider` context wrapping `DashboardClient` — single `useGeminiLive` instance shared by all views
- [ ] Move `useGeminiLive` call from `chat.tsx` and `workspace.tsx` into `VoiceProvider`
- [ ] Route tool calls based on `activeView` — workspace tools when in workspace, orchestrator tools when in chat
- [ ] Add `navigate_to_view` tool to Gemini tool declarations so the voice agent can switch views (e.g. "show me the workspace", "open drafts")
- [ ] Implement `navigate_to_view` handler in `VoiceProvider` that calls `setActiveView()` from `LayoutShell` context
- [ ] Remove auto-disconnect in `workspace.tsx` (lines 155-162) — voice should persist across view changes
- [ ] Ensure audio context and media stream survive React component unmount/remount cycles
- [ ] Add voice state indicator to `LayoutShell` header so users know voice is active regardless of current view
- [ ] Handle edge case: switching views mid-tool-call (queue or reject conflicting tools)

### Demo

- [ ] Persist demo affect simulation across view switches (currently resets to "calm" on remount)
- [ ] Show Token Vault status in voice indicator even when not on the originating view
- [ ] Demo script: voice agent navigates from Chat → Workspace → back while maintaining conversation context
- [ ] Ensure `isDemo` flag propagates through `VoiceProvider` so demo overrides apply globally

## Verification

Owner: _unassigned_ | Last verified: _never_

- [ ] `npm run gates` passes with workspace components (lint + typecheck + build)
- [ ] Desktop: Product tiles render in workspace view, are selectable, Inspector opens on click
- [ ] Mobile: Tiles display as scrollable grid, tap opens bottom-sheet Inspector, long-press enters multi-select
- [ ] Voice: Mic on Intent Bar triggers voice flow, Living Surface responds with live preview of changes
- [ ] Changeset: In-place diff overlays appear on affected product tiles (strikethrough old price, glow new price, risk dots)
- [ ] Theme: Ambient color system works in both light and dark mode (temperature shifts, category hues, promo auras)
- [ ] Accessibility: Keyboard-navigable tiles (Tab/Space/Escape), reduced-motion respected, ARIA labels present
