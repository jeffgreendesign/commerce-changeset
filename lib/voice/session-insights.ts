/**
 * Session Insights — persists per-user voice session metadata and detects
 * longitudinal behavioral patterns (stress, timing, workflow habits).
 *
 * Hybrid storage: in-memory Map for hot cache + Google Sheets for persistence.
 * Pattern detection accepts pre-loaded logs (from Sheets or memory).
 *
 * Examples of insights surfaced:
 * - "Thursdays seem much more stressful for you. Maybe move updates to Wed PM?"
 * - "Error rate doubles after 45-minute sessions — consider shorter sessions."
 */

import type { VoiceSessionLog, SessionPattern, SpeechPace } from "./types";

// ── In-memory hot cache ──────────────────────────────────────────────

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

/** Record a completed voice session in the in-memory hot cache. */
export function recordSession(log: VoiceSessionLog): void {
  const existing = sessionStore.get(log.userId) ?? [];
  existing.push(log);
  sessionStore.set(log.userId, existing);
}

/** Retrieve all session logs for a user from the in-memory cache. */
export function getSessionLogs(userId: string): VoiceSessionLog[] {
  return sessionStore.get(userId) ?? [];
}

/**
 * Analyze session history and detect behavioral patterns.
 *
 * Accepts pre-loaded logs (from Sheets or in-memory cache).
 * Requires at least 5 sessions to produce meaningful patterns.
 * Returns null if insufficient data.
 */
export function detectPatterns(logs: VoiceSessionLog[]): SessionPattern | null {
  if (logs.length < 5) return null;

  // Try day-of-week stress pattern first
  const dayPattern = detectDayOfWeekStress(logs);
  if (dayPattern) return dayPattern;

  // Try time-of-day stress pattern
  const timePattern = detectTimeOfDayStress(logs);
  if (timePattern) return timePattern;

  // Try session duration trend
  const durationPattern = detectDurationTrend(logs);
  if (durationPattern) return durationPattern;

  return null;
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

// ── Pattern detectors ───────────────────────────────────────────────

/** Detect day-of-week stress patterns (original algorithm). */
function detectDayOfWeekStress(
  logs: VoiceSessionLog[]
): SessionPattern | null {
  const byDay = new Map<string, VoiceSessionLog[]>();
  for (const log of logs) {
    const existing = byDay.get(log.dayOfWeek) ?? [];
    existing.push(log);
    byDay.set(log.dayOfWeek, existing);
  }

  const overallAvgStress =
    logs.reduce((sum, l) => sum + l.avgStressLevel, 0) / logs.length;

  let highestStressDay: string | undefined;
  let highestStressAvg = 0;

  for (const [day, dayLogs] of byDay) {
    if (dayLogs.length < 2) continue;
    const dayAvg =
      dayLogs.reduce((sum, l) => sum + l.avgStressLevel, 0) / dayLogs.length;
    if (dayAvg > highestStressAvg) {
      highestStressAvg = dayAvg;
      highestStressDay = day;
    }
  }

  const stressMultiplier =
    overallAvgStress > 0 ? highestStressAvg / overallAvgStress : 1;

  if (!highestStressDay || stressMultiplier < 1.5) return null;

  const dayIndex = DAYS.indexOf(highestStressDay);
  const alternativeDay = DAYS[(dayIndex + 6) % 7];

  return {
    description: `${highestStressDay}s seem much more stressful for you (${stressMultiplier.toFixed(1)}x average). Maybe move these updates to ${alternativeDay} PM?`,
    dayOfWeek: highestStressDay,
    stressMultiplier,
    suggestion: `Consider moving recurring tasks to ${alternativeDay} afternoon`,
    sampleSize: logs.length,
  };
}

/** Detect time-of-day stress patterns (morning/afternoon/evening). */
function detectTimeOfDayStress(
  logs: VoiceSessionLog[]
): SessionPattern | null {
  const buckets: Record<string, VoiceSessionLog[]> = {
    morning: [],
    afternoon: [],
    evening: [],
  };

  for (const log of logs) {
    if (log.hourOfDay < 12) buckets.morning.push(log);
    else if (log.hourOfDay < 17) buckets.afternoon.push(log);
    else buckets.evening.push(log);
  }

  const overallAvg =
    logs.reduce((sum, l) => sum + l.avgStressLevel, 0) / logs.length;

  let highestBucket: string | undefined;
  let highestAvg = 0;

  for (const [bucket, bucketLogs] of Object.entries(buckets)) {
    if (bucketLogs.length < 2) continue;
    const avg =
      bucketLogs.reduce((sum, l) => sum + l.avgStressLevel, 0) /
      bucketLogs.length;
    if (avg > highestAvg) {
      highestAvg = avg;
      highestBucket = bucket;
    }
  }

  const multiplier = overallAvg > 0 ? highestAvg / overallAvg : 1;
  if (!highestBucket || multiplier < 1.5) return null;

  const alternatives: Record<string, string> = {
    morning: "afternoon",
    afternoon: "morning",
    evening: "morning",
  };

  return {
    description: `${highestBucket.charAt(0).toUpperCase() + highestBucket.slice(1)} sessions are ${multiplier.toFixed(1)}x more stressful than average.`,
    suggestion: `Try scheduling commerce updates in the ${alternatives[highestBucket]}`,
    sampleSize: logs.length,
  };
}

/** Detect increasing session duration trend (fatigue indicator). */
function detectDurationTrend(
  logs: VoiceSessionLog[]
): SessionPattern | null {
  if (logs.length < 6) return null;

  const sorted = [...logs].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  const half = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, half);
  const secondHalf = sorted.slice(half);

  const avgFirst =
    firstHalf.reduce((sum, l) => sum + l.sessionDurationMinutes, 0) /
    firstHalf.length;
  const avgSecond =
    secondHalf.reduce((sum, l) => sum + l.sessionDurationMinutes, 0) /
    secondHalf.length;

  // Flag if recent sessions are 50%+ longer
  if (avgFirst > 0 && avgSecond / avgFirst > 1.5) {
    return {
      description: `Your recent sessions are ${((avgSecond / avgFirst - 1) * 100).toFixed(0)}% longer than earlier ones (${avgSecond.toFixed(0)}min vs ${avgFirst.toFixed(0)}min).`,
      suggestion:
        "Consider breaking complex changes into shorter focused sessions",
      sampleSize: logs.length,
    };
  }

  return null;
}
