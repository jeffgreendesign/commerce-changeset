/**
 * Shared view types for the dashboard navigation system.
 *
 * Both the layout context and the navigation history hook
 * import from here to keep the union values in sync.
 */

export const ACTIVE_VIEWS = [
  "chat",
  "history",
  "actions",
  "workspace",
  "drafts",
  "timeline",
  "activity",
] as const;

export type ActiveView = (typeof ACTIVE_VIEWS)[number];
