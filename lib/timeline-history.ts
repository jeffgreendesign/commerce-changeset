/**
 * Timeline history persistence via localStorage.
 *
 * Exposes a useSyncExternalStore-compatible API so consumers avoid
 * hydration mismatches (server snapshot returns [], client lazily loads).
 */

import { z } from "zod/v4";
import type { ChangeSet } from "@/lib/changeset/types";

// ── Types ────────────────────────────────────────────────────────────

export interface TimelineEntry {
  changeset: ChangeSet;
  completedAt: string;
}

// ── Constants ────────────────────────────────────────────────────────

const STORAGE_KEY = "commerce-changeset-timeline";
const MAX_ENTRIES = 100;
const EMPTY: TimelineEntry[] = [];

// ── Validation ───────────────────────────────────────────────────────

const TimelineEntrySchema = z.object({
  changeset: z.object({
    id: z.string(),
    originalPrompt: z.string(),
    status: z.string(),
    operations: z.array(z.record(z.string(), z.unknown())),
  }).passthrough(),
  completedAt: z.string(),
});

// ── Internal helpers ─────────────────────────────────────────────────

function cappedAppend(prev: TimelineEntry[], entry: TimelineEntry): TimelineEntry[] {
  const next = [...prev, entry];
  return next.length > MAX_ENTRIES ? next.slice(-MAX_ENTRIES) : next;
}

function loadFromStorage(): TimelineEntry[] {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(raw)) return EMPTY;
    return raw.filter(
      (entry: unknown) => TimelineEntrySchema.safeParse(entry).success,
    ) as TimelineEntry[];
  } catch {
    return EMPTY;
  }
}

function persistToStorage(entries: TimelineEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    const trimmed = entries.slice(-MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (err) {
    console.error("[timeline-history] persist failed:", err);
  }
}

// ── Store (useSyncExternalStore-compatible) ──────────────────────────

let cache: TimelineEntry[] | null = null;
const listeners = new Set<() => void>();

function notify() {
  for (const cb of listeners) cb();
}

/** Subscribe to timeline changes. Returns an unsubscribe function. */
export function subscribeTimeline(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

/** Client snapshot — lazily loads from localStorage on first access. */
export function getTimelineSnapshot(): TimelineEntry[] {
  if (cache === null) cache = loadFromStorage();
  return cache;
}

/** Server snapshot — always returns empty (avoids hydration mismatch). */
export function getTimelineServerSnapshot(): TimelineEntry[] {
  return EMPTY;
}

/** Append an entry, persist to localStorage, and notify subscribers. */
export function appendTimelineEntry(entry: TimelineEntry): void {
  cache = cappedAppend(getTimelineSnapshot(), entry);
  persistToStorage(cache);
  notify();
}

// ── Cross-tab sync ──────────────────────────────────────────────────

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    cache = e.newValue === null ? EMPTY : loadFromStorage();
    notify();
  });
}
