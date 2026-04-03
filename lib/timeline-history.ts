/**
 * Timeline history persistence via localStorage.
 *
 * Mirrors the chat-history pattern: load/save with a cap on entries.
 */

import type { ChangeSet } from "@/lib/changeset/types";

// ── Types ────────────────────────────────────────────────────────────

export interface TimelineEntry {
  changeset: ChangeSet;
  completedAt: string;
}

// ── Constants ────────────────────────────────────────────────────────

const STORAGE_KEY = "commerce-changeset-timeline";
const MAX_ENTRIES = 100;

// ── Storage operations ───────────────────────────────────────────────

export function loadTimeline(): TimelineEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const entries: TimelineEntry[] = JSON.parse(raw);
    return entries;
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
