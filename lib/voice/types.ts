/**
 * Voice module types — shared across Gemini Live integration, session insights,
 * repetition detection, and proactive analysis.
 */

// ── Voice session & emotional context ────────────────────────────────

/** Emotional state derived from Gemini Live API affective dialog signals. */
export type EmotionalState = "calm" | "stressed" | "rushed" | "uncertain";

/** Speech pace classification from audio analysis. */
export type SpeechPace = "fast" | "normal" | "slow";

/** Voice metrics captured during a Gemini Live session. */
export interface VoiceMetrics {
  tone: string;
  pace: SpeechPace;
  /** Pitch variance — higher values indicate more emotional expression. */
  pitchVariance: number;
  /** 0-1 scale, derived from Gemini affective dialog. */
  stressLevel: number;
  /** Confidence of the emotional state classification. */
  confidence: number;
}

/** Context enrichment attached to requests flowing through the agent pipeline. */
export interface VoiceUserContext {
  emotionalState: EmotionalState;
  voiceMetrics: VoiceMetrics;
  sessionPattern?: SessionPattern;
}

// ── Session insights & pattern memory ────────────────────────────────

/** A single voice session log entry persisted for pattern analysis. */
export interface VoiceSessionLog {
  userId: string;
  sessionId: string;
  timestamp: string;
  dayOfWeek: string;
  hourOfDay: number;
  avgStressLevel: number;
  avgSpeechPace: SpeechPace;
  operationCount: number;
  operationTypes: string[];
  errorCount: number;
  sessionDurationMinutes: number;
}

/** Pattern detected across multiple sessions for a user. */
export interface SessionPattern {
  /** e.g. "High stress on Thursdays" */
  description: string;
  /** Day most associated with the pattern. */
  dayOfWeek?: string;
  /** Average stress level for the pattern day vs. other days. */
  stressMultiplier?: number;
  /** Suggested alternative schedule. */
  suggestion?: string;
  /** Number of sessions analyzed to derive this pattern. */
  sampleSize: number;
}

// ── Repetition detection ─────────────────────────────────────────────

/** Signal emitted when the orchestrator detects repetitive operations. */
export interface RepetitionSignal {
  isRepetitive: boolean;
  /** Human-readable description of the pattern. */
  patternDescription: string;
  /** Suggested bulk action to replace individual operations. */
  suggestedBulkAction?: string;
  /** SKUs or targets that would be affected by the bulk operation. */
  affectedTargets: string[];
  /** Pre-built confirmation table for user review. */
  confirmationTable: ConfirmationRow[];
}

/** A single row in the bulk suggestion confirmation table. */
export interface ConfirmationRow {
  sku: string;
  productName: string;
  currentPrice: string | number;
  proposedPrice: string | number;
  field: string;
}

// ── Proactive insights ───────────────────────────────────────────────

/** Severity level for proactive issues. */
export type IssueSeverity = "info" | "warning" | "error";

/** A proactive issue detected by analyzing reader data against business rules. */
export interface ProactiveIssue {
  severity: IssueSeverity;
  operationId: string;
  /** Human-readable description of the issue. */
  description: string;
  /** Ready-to-apply fix operation, if one can be generated. */
  suggestedFix?: {
    action: string;
    target: string;
    field: string;
    currentValue: string | number;
    suggestedValue: string | number;
  };
}

// ── Re-export ExecutorCallbacks from changeset layer ─────────────────

export type { ExecutorCallbacks } from "@/lib/changeset/types";

// ── Gemini Live API configuration ────────────────────────────────────

/** Configuration for establishing a Gemini Live API session. */
export interface GeminiLiveConfig {
  /** Gemini model identifier for Live API. */
  model: string;
  /** Enable affective dialog for emotion detection. */
  enableAffectiveDialog: boolean;
  /** Enable proactive audio for smart interruptions. */
  enableProactiveAudio: boolean;
  /** Voice preset for TTS output. */
  voicePreset: string;
  /** Language code (e.g. "en-US"). */
  languageCode: string;
  /** System instruction for the Gemini Live session. */
  systemInstruction: string;
}

/** Events emitted by the Gemini Live WebSocket connection. */
export type GeminiLiveEvent =
  | { type: "transcript"; text: string; isFinal: boolean }
  | { type: "audio"; data: ArrayBuffer }
  | { type: "affective"; stressLevel: number; tone: string; pace: SpeechPace }
  | { type: "tool_call"; name: string; args: Record<string, unknown> }
  | { type: "generation_complete" }
  | { type: "error"; message: string };
