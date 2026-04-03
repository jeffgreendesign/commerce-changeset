/**
 * Timeline history persistence via localStorage.
 *
 * Mirrors the chat-history pattern: load/save with a cap on entries.
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

// ── Helpers ──────────────────────────────────────────────────────────

/** Append an entry to the list, capping at MAX_ENTRIES. */
export function cappedAppend(prev: TimelineEntry[], entry: TimelineEntry): TimelineEntry[] {
  const next = [...prev, entry];
  return next.length > MAX_ENTRIES ? next.slice(-MAX_ENTRIES) : next;
}

// ── Storage operations ───────────────────────────────────────────────

export function loadTimeline(): TimelineEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(raw)) return [];
    return raw.filter(
      (entry: unknown) => TimelineEntrySchema.safeParse(entry).success,
    ) as TimelineEntry[];
  } catch {
    return [];
  }
}

export function saveTimeline(entries: TimelineEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    const trimmed = entries.slice(-MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (err) {
    console.error("[timeline-history] saveTimeline failed:", err);
  }
}
