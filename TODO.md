# TODO — Living Workspace

Extracted from [`docs/living-workspace-design-spec.md`](docs/living-workspace-design-spec.md).

> **Note:** Last validated against the codebase on 2026-04-05.

## Living Surface Foundation

- [x] Create `app/dashboard/workspace.tsx` — workspace component as default view alongside chat
- [x] Create `components/workspace/living-surface.tsx` — product tile grid with selection model
- [x] Create `components/workspace/product-tile.tsx` — individual tile with ambient indicators
- [x] Create `components/workspace/intent-bar.tsx` — voice-first command surface
- ~~[ ] Create `components/workspace/context-spine.tsx` — thin icon navigation rail~~ Removed — replaced by unified Rail (`components/dashboard/rail.tsx`)
- [x] Create `components/workspace/workspace-provider.tsx` — React context for workspace state
- [x] Add ambient CSS to `app/globals.css` — workspace, product-tile, intent-bar, changeset-summary, inspector, and reduced-motion classes
- [x] Update `app/dashboard/dashboard-client.tsx` — add workspace as a view option alongside chat
- [x] Update `components/dashboard/layout-shell.tsx` — add `"workspace"` to `ActiveView` union

## Changeset Materialization

- ~~[ ] Create `components/workspace/changeset-overlay.tsx` — in-place diff overlays on product tiles~~ Never created — diff rendering handled inline in `product-tile.tsx`
- [x] Create `components/workspace/changeset-summary.tsx` — floating summary panel with operation count, risk, and execute/cancel
- [ ] Adapt `components/changeset/diff-view.tsx` for tile-based overlays (strikethrough old values, glow new values on product tiles)
- [x] Adapt `components/changeset/risk-badge.tsx` for tile-level risk indicators (inline dots replacing promo dots during draft state) — done in `product-tile.tsx` via `TIER_DOT_STYLE`

## Inspector & Timeline

- [x] Create `components/workspace/inspector-panel.tsx` — right panel with inline editing, price history sparkline, audit trail
- [x] Create `components/workspace/timeline-view.tsx` — horizontal changeset timeline with scrub-to-view
- ~~[ ] Adapt `components/dashboard/agent-activity.tsx` for Context Spine Activity view~~ Obsolete — Context Spine replaced by Rail

## Ambient Intelligence

- [x] Create `components/workspace/ambient-layer.tsx` — CSS background layer with temperature-driven color shifts
- [x] Add proactive notification overlays on product tiles (reuse `lib/voice/proactive-insights.ts` for suggestions like "promo ends tomorrow, inventory still high") — aura overlays + risk dots in `product-tile.tsx`
- [x] Add workspace breathing animations (pulse rhythm reflecting system health, disruption on errors) — `ws-pulse` + `tile-breathe` in `globals.css`

## Chat as Secondary View

- [x] Keep `app/dashboard/chat.tsx` accessible via Rail icon
- [x] Chat serves as "transcript" mode for complex reasoning

## Persistent Voice Agent

Goal: Keep the voice agent session alive across view navigation so users can continue a voice conversation while switching between Chat, Workspace, Actions, etc. The voice agent should also be able to navigate the app programmatically when executing commands.

### Production

- [x] Create `VoiceProvider` context wrapping `DashboardClient` — single `useGeminiLive` instance shared by all views (`voice-provider.tsx` wraps via `dashboard-client.tsx:108`)
- [x] Move `useGeminiLive` call from `chat.tsx` and `workspace.tsx` into `VoiceProvider` — single instance at `voice-provider.tsx:360`
- [x] Route tool calls based on `activeView` — workspace tools when in workspace, orchestrator tools when in chat (`voice-provider.tsx:142`)
- [x] Add `navigate_to_view` tool to Gemini tool declarations so the voice agent can switch views (`gemini-live.ts:307`)
- [x] Add `select_product` tool to Gemini tool declarations for instant product navigation (`gemini-live.ts:324`, fuzzy matching in `voice-provider.tsx:217-311`)
- [x] Implement `navigate_to_view` handler in `VoiceProvider` that calls `setActiveView()` from `LayoutShell` context (`voice-provider.tsx:206`)
- [x] Remove auto-disconnect in `workspace.tsx` — voice persists across view changes
- [x] Ensure audio context and media stream survive React component unmount/remount cycles — centralized in VoiceProvider
- [x] Add voice state indicator to `LayoutShell` header so users know voice is active regardless of current view (`VoiceIndicator` in `dashboard-client.tsx:40`)
- [ ] Handle edge case: switching views mid-tool-call (queue or reject conflicting tools) — partially handled: handler captured at call start completes to end (`voice-provider.tsx:331`), but no explicit queue/reject logic

### Demo

- [x] Persist demo affect simulation across view switches — state in VoiceProvider context (`voice-provider.tsx:182-190`), survives navigation
- [ ] Show Token Vault status in voice indicator even when not on the originating view — currently isolated to `token-vault-activity.tsx`
- [ ] Demo script: voice agent navigates from Chat → Workspace → back while maintaining conversation context
- [x] Ensure `isDemo` flag propagates through `VoiceProvider` so demo overrides apply globally (`voice-provider.tsx:142,148,368`)

## Verification

Owner: _unassigned_ | Last verified: _never_

- [ ] `npm run gates` passes with workspace components (lint + typecheck + build)
- [ ] Desktop: Product tiles render in workspace view, are selectable, Inspector opens on click
- [ ] Mobile: Tiles display as scrollable grid, tap opens bottom-sheet Inspector, long-press enters multi-select
- [ ] Voice: Mic on Intent Bar triggers voice flow, Living Surface responds with live preview of changes
- [ ] Changeset: In-place diff overlays appear on affected product tiles (strikethrough old price, glow new price, risk dots)
- [ ] Theme: Ambient color system works in both light and dark mode (temperature shifts, category hues, promo auras)
- [ ] Accessibility: Keyboard-navigable tiles (Tab/Space/Escape), reduced-motion respected, ARIA labels present
