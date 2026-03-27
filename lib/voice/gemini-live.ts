/**
 * Gemini Live API client — configuration builders for the dual-model
 * sidecar voice architecture.
 *
 * Architecture:
 *   Browser mic → AudioWorklet → 16kHz PCM (shared stream)
 *     ├─→ Primary (3.1 Flash Live) — conversation, tool calls, audio response
 *     └─→ Sidecar (2.5 Native Audio) — silent affective signal analysis
 */

import type {
  GeminiLiveConfig,
  GeminiLiveEvent,
  VoiceMetrics,
  EmotionalState,
  SpeechPace,
} from "./types";

// ── Model constants ─────────────────────────────────────────────────

/** Primary model — fast conversation, tool calls, audio output. */
export const PRIMARY_MODEL = "gemini-3.1-flash-live-preview";

/** Sidecar model — affective dialog + proactive audio (silent listener). */
export const SIDECAR_MODEL =
  "gemini-2.5-flash-native-audio-preview-12-2025";

// ── Default configuration ────────────────────────────────────────────

const COMMERCE_SYSTEM_INSTRUCTION = `You are a voice assistant for Commerce Changeset, a commerce operations platform.
You help users manage product pricing, promotions, and inventory through natural conversation.

Your role:
- Listen to user requests for commerce changes (price updates, promo toggles, inventory flags)
- Narrate what the agent system is doing in real-time as operations execute
- Match your tone to the risk level: calm for routine changes, deliberate for high-risk bulk operations
- Proactively surface issues: margin violations, scheduling conflicts, inconsistencies
- Suggest workflow optimizations: bulk operations for repetitive tasks, better scheduling

When the user sounds stressed or rushed:
- Slow your speech pace
- Add confirmation steps before high-risk operations
- Suggest breaking large changes into smaller batches

When narrating agent activity:
- "The reader agent is pulling current pricing for your products..."
- "I've found the data. The orchestrator is decomposing your request into 4 operations..."
- "Writer is executing operation 2 of 4 — updating STR-001 promo price..."
- "All operations complete. Sending notification email now."

For CIBA approval gates:
- "Your changeset has 3 operations requiring approval. I've sent a push notification to your phone."
- "Say 'approve' to confirm by voice, or use your Guardian app."`;

const SIDECAR_SYSTEM_INSTRUCTION = `You are a silent voice affect monitor. Analyze the user's speech patterns for:
- Stress indicators (pitch elevation, speech rate changes, hesitation)
- Emotional state (calm, stressed, rushed, uncertain)
- Speech pace (fast, normal, slow)
Do not generate spoken responses. Only provide text-based affect analysis.
When you detect a change in emotional state, describe it briefly (e.g. "stressed: elevated pitch, faster pace").`;

const DEFAULT_CONFIG: GeminiLiveConfig = {
  model: PRIMARY_MODEL,
  enableAffectiveDialog: true,
  enableProactiveAudio: true,
  voicePreset: "Kore",
  languageCode: "en-US",
  systemInstruction: COMMERCE_SYSTEM_INSTRUCTION,
};

// ── SDK configuration builders ──────────────────────────────────────

/**
 * Build the SDK config for the primary (3.1 Flash Live) connection.
 *
 * Handles conversation, tool calls, and audio output.
 * 3.1 does NOT support affective dialog or proactive audio.
 */
export function buildPrimarySDKConfig(
  config: GeminiLiveConfig = DEFAULT_CONFIG
): Record<string, unknown> {
  return {
    responseModalities: ["AUDIO"],
    speechConfig: {
      voiceConfig: {
        prebuiltVoiceConfig: {
          voiceName: config.voicePreset,
        },
      },
    },
    systemInstruction: config.systemInstruction,
    tools: buildToolDeclarations(),
    inputAudioTranscription: {},
    outputAudioTranscription: {},
  };
}

/**
 * Build the SDK config for the sidecar (2.5 Native Audio) connection.
 *
 * Silent listener — TEXT output only, no tools, affective dialog enabled.
 */
export function buildSidecarSDKConfig(): Record<string, unknown> {
  return {
    responseModalities: ["TEXT"],
    systemInstruction: {
      parts: [{ text: SIDECAR_SYSTEM_INSTRUCTION }],
    },
    realtimeInputConfig: {
      automaticActivityDetection: {
        disabled: false,
      },
    },
    inputAudioTranscription: {},
    enableAffectiveDialog: true,
    proactivity: {
      proactiveAudio: true,
    },
  };
}

// ── Session management ───────────────────────────────────────────────

export interface GeminiLiveSession {
  sessionId: string;
  config: GeminiLiveConfig;
  startedAt: string;
  /** Accumulated voice metrics samples for the session. */
  metricsSamples: VoiceMetrics[];
  /** Whether the session is currently connected. */
  isConnected: boolean;
}

/**
 * Create a new Gemini Live session configuration.
 *
 * Returns the session config for the API route to use.
 */
export function createSession(
  overrides?: Partial<GeminiLiveConfig>
): GeminiLiveSession {
  const config: GeminiLiveConfig = { ...DEFAULT_CONFIG, ...overrides };

  return {
    sessionId: crypto.randomUUID(),
    config,
    startedAt: new Date().toISOString(),
    metricsSamples: [],
    isConnected: false,
  };
}

/**
 * Build the Gemini Live API setup message for raw WebSocket connection.
 *
 * Kept for backward compatibility with the /api/voice init action.
 */
export function buildSetupMessage(
  config: GeminiLiveConfig
): Record<string, unknown> {
  return {
    setup: {
      model: `models/${config.model}`,
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: config.voicePreset,
            },
          },
        },
      },
      systemInstruction: {
        parts: [{ text: config.systemInstruction }],
      },
      realtimeInputConfig: {
        automaticActivityDetection: {
          disabled: false,
        },
      },
      ...(config.enableAffectiveDialog && {
        enableAffectiveDialog: true,
      }),
      ...(config.enableProactiveAudio && {
        proactivity: {
          proactiveAudio: true,
        },
      }),
      tools: buildToolDeclarations(),
    },
  };
}

// ── Tool declarations ───────────────────────────────────────────────

/**
 * Build tool declarations for Gemini Live to call back into our agent system.
 *
 * These map to the existing orchestrator/reader/writer/notifier pipeline.
 */
export function buildToolDeclarations(): Record<string, unknown>[] {
  return [
    {
      functionDeclarations: [
        {
          name: "submit_commerce_change",
          description:
            "Submit a commerce change request to the orchestrator agent. " +
            "The orchestrator will decompose it into operations, evaluate policy, and build a changeset.",
          parameters: {
            type: "OBJECT",
            properties: {
              request: {
                type: "STRING",
                description: "The natural-language commerce change request",
              },
            },
            required: ["request"],
          },
        },
        {
          name: "execute_changeset",
          description:
            "Execute an approved changeset. Triggers CIBA approval if required, " +
            "then runs the writer agent to apply changes.",
          parameters: {
            type: "OBJECT",
            properties: {
              changesetId: {
                type: "STRING",
                description: "The ID of the changeset to execute",
              },
            },
            required: ["changesetId"],
          },
        },
        {
          name: "query_product_data",
          description:
            "Query current product data, pricing, or launch schedule " +
            "via the reader agent. For informational queries only.",
          parameters: {
            type: "OBJECT",
            properties: {
              query: {
                type: "STRING",
                description: "The data query to run",
              },
            },
            required: ["query"],
          },
        },
        {
          name: "voice_approve",
          description:
            "Approve a pending CIBA approval request via voice confirmation. " +
            "Alternative to Guardian push notification approval.",
          parameters: {
            type: "OBJECT",
            properties: {
              changesetId: {
                type: "STRING",
                description: "The changeset awaiting approval",
              },
              confirmation: {
                type: "STRING",
                description:
                  "The user's verbal confirmation (e.g. 'yes, approve')",
              },
            },
            required: ["changesetId", "confirmation"],
          },
        },
      ],
    },
  ];
}

// ── Affective signal processing ──────────────────────────────────────

/**
 * Classify emotional state from accumulated voice metrics.
 *
 * Uses stress level and speech pace to determine overall emotional state.
 */
export function classifyEmotionalState(
  metrics: VoiceMetrics
): EmotionalState {
  if (metrics.stressLevel > 0.7) return "stressed";
  if (metrics.pace === "fast" && metrics.stressLevel > 0.4) return "rushed";
  if (metrics.stressLevel > 0.3 && metrics.pitchVariance > 0.6)
    return "uncertain";
  return "calm";
}

/**
 * Compute aggregate voice metrics from a session's metric samples.
 */
export function aggregateMetrics(samples: VoiceMetrics[]): VoiceMetrics {
  if (samples.length === 0) {
    return {
      tone: "neutral",
      pace: "normal",
      pitchVariance: 0,
      stressLevel: 0,
      confidence: 0,
    };
  }

  const avgStress =
    samples.reduce((sum, s) => sum + s.stressLevel, 0) / samples.length;
  const avgPitchVariance =
    samples.reduce((sum, s) => sum + s.pitchVariance, 0) / samples.length;
  const avgConfidence =
    samples.reduce((sum, s) => sum + s.confidence, 0) / samples.length;

  // Determine dominant pace
  const paceCounts: Record<SpeechPace, number> = {
    fast: 0,
    normal: 0,
    slow: 0,
  };
  for (const s of samples) {
    paceCounts[s.pace]++;
  }
  const dominantPace = (
    Object.entries(paceCounts) as [SpeechPace, number][]
  ).reduce((a, b) => (b[1] > a[1] ? b : a))[0];

  return {
    tone: avgStress > 0.5 ? "tense" : "neutral",
    pace: dominantPace,
    pitchVariance: avgPitchVariance,
    stressLevel: avgStress,
    confidence: avgConfidence,
  };
}

/**
 * Parse a Gemini Live affective signal event into VoiceMetrics.
 */
export function parseAffectiveEvent(
  event: Extract<GeminiLiveEvent, { type: "affective" }>
): VoiceMetrics {
  return {
    tone: event.tone,
    pace: event.pace,
    pitchVariance: 0.5, // Gemini doesn't expose raw pitch variance; use moderate default
    stressLevel: event.stressLevel,
    confidence: 0.8,
  };
}
