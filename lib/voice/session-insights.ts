/**
 * Session Insights — persists per-user voice session metadata and detects
 * longitudinal behavioral patterns (stress, timing, workflow habits).
 *
 * Examples of insights surfaced:
 * - "Thursdays seem much more stressful for you. Maybe move updates to Wed PM?"
 * - "Error rate doubles after 45-minute sessions — consider shorter sessions."
 */

import type { VoiceSessionLog, SessionPattern, SpeechPace } from "./types";

// ── In-memory store (swap for DB/KV in production) ───────────────────

const sessionStore = new Map<string, VoiceSessionLog[]>();

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

// ── Public API ───────────────────────────────────────────────────────

/** Record a completed voice session for pattern analysis. */
export function recordSession(log: VoiceSessionLog): void {
  const existing = sessionStore.get(log.userId) ?? [];
  existing.push(log);
  sessionStore.set(log.userId, existing);
}

/** Retrieve all session logs for a user. */
export function getSessionLogs(userId: string): VoiceSessionLog[] {
  return sessionStore.get(userId) ?? [];
}

/**
 * Analyze session history and detect behavioral patterns.
 *
 * Requires at least 5 sessions to produce meaningful patterns.
 * Returns null if insufficient data.
 */
export function detectPatterns(userId: string): SessionPattern | null {
  const logs = sessionStore.get(userId);
  if (!logs || logs.length < 5) return null;

  // Group sessions by day of week
  const byDay = new Map<string, VoiceSessionLog[]>();
  for (const log of logs) {
    const existing = byDay.get(log.dayOfWeek) ?? [];
    existing.push(log);
    byDay.set(log.dayOfWeek, existing);
  }

  // Compute average stress per day
  const overallAvgStress =
    logs.reduce((sum, l) => sum + l.avgStressLevel, 0) / logs.length;

  let highestStressDay: string | undefined;
  let highestStressAvg = 0;

  for (const [day, dayLogs] of byDay) {
    if (dayLogs.length < 2) continue; // Need at least 2 sessions on a day

    const dayAvg =
      dayLogs.reduce((sum, l) => sum + l.avgStressLevel, 0) / dayLogs.length;

    if (dayAvg > highestStressAvg) {
      highestStressAvg = dayAvg;
      highestStressDay = day;
    }
  }

  // Only surface pattern if stress is meaningfully higher on one day
  const stressMultiplier =
    overallAvgStress > 0 ? highestStressAvg / overallAvgStress : 1;

  if (!highestStressDay || stressMultiplier < 1.5) {
    return null;
  }

  // Find a lower-stress alternative day
  const dayIndex = DAYS.indexOf(highestStressDay);
  const alternativeDay = DAYS[(dayIndex + 6) % 7]; // Day before

  return {
    description: `${highestStressDay}s seem much more stressful for you (${stressMultiplier.toFixed(1)}x average). Maybe move these updates to ${alternativeDay} PM?`,
    dayOfWeek: highestStressDay,
    stressMultiplier,
    suggestion: `Consider moving recurring tasks to ${alternativeDay} afternoon`,
    sampleSize: logs.length,
  };
}

/**
 * Classify the dominant speech pace from a stream of pace samples.
 */
export function classifyPace(samples: SpeechPace[]): SpeechPace {
  if (samples.length === 0) return "normal";

  const counts = { fast: 0, normal: 0, slow: 0 };
  for (const s of samples) {
    counts[s]++;
  }

  if (counts.fast > counts.normal && counts.fast > counts.slow) return "fast";
  if (counts.slow > counts.normal && counts.slow > counts.fast) return "slow";
  return "normal";
}

/**
 * Check for session fatigue indicators.
 *
 * Returns a warning message if the user appears fatigued, or null.
 */
export function checkSessionFatigue(
  durationMinutes: number,
  errorCount: number
): string | null {
  if (durationMinutes > 60 && errorCount > 2) {
    return `You've been working for ${Math.round(durationMinutes)} minutes with ${errorCount} errors. Consider taking a break — accuracy tends to drop after extended sessions.`;
  }

  if (durationMinutes > 90) {
    return `Session has been active for ${Math.round(durationMinutes)} minutes. A short break might help maintain accuracy.`;
  }

  return null;
}
