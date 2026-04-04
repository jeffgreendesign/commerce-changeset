/**
 * Voice API route — Gemini Live session management, voice-enriched orchestration,
 * and persistent session analytics via Google Sheets.
 *
 * POST /api/voice
 *   action: "init"  — initialize session, load historical patterns from Sheets
 *   action: "submit" — voice-enriched orchestrator call (unchanged)
 *   action: "end_session" — persist session log to Sheets + in-memory cache
 */

import { NextResponse } from "next/server";
import { z } from "zod/v4";

import { auth0 } from "@/lib/auth0";
import { isDemoSession } from "@/lib/demo/config.server";
import { setAIContext } from "@auth0/ai-vercel";
import { Auth0AI, getAccessTokenFromTokenVault } from "@auth0/ai-vercel";
import { TokenVaultInterrupt } from "@auth0/ai/interrupts";
import { tool } from "ai";
import { runOrchestratorAgent } from "@/lib/agents/orchestrator";
import {
  createSession,
  buildSetupMessage,
  classifyEmotionalState,
} from "@/lib/voice/gemini-live";
import {
  recordSession,
  getSessionLogs,
  detectPatterns,
  checkSessionFatigue,
} from "@/lib/voice/session-insights";
import {
  appendSessionToSheet,
  readUserSessionsFromSheet,
} from "@/lib/voice/sheets-persistence";
import type { VoiceUserContext, ExtendedVoiceSessionLog } from "@/lib/voice/types";

// ── Token Vault setup (singleton) ───────────────────────────────────

const auth0AI = new Auth0AI();

// ── Request schemas ──────────────────────────────────────────────────

const VoiceMetricsSchema = z.object({
  tone: z.string(),
  pace: z.enum(["fast", "normal", "slow"]),
  pitchVariance: z.number().min(0).max(1),
  stressLevel: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
});

const InitSessionSchema = z.object({
  action: z.literal("init"),
  languageCode: z.string().optional(),
  voicePreset: z.string().optional(),
});

const SubmitVoiceSchema = z.object({
  action: z.literal("submit"),
  message: z.string().min(1).max(2000),
  voiceMetrics: VoiceMetricsSchema,
  sessionId: z.string().uuid(),
  sessionDurationMinutes: z.number().min(0).optional(),
  errorCount: z.number().min(0).optional(),
});

const EndSessionSchema = z.object({
  action: z.literal("end_session"),
  sessionId: z.string().uuid(),
  sessionDurationMinutes: z.number().min(0),
  operationCount: z.number().min(0),
  operationTypes: z.array(z.string()),
  errorCount: z.number().min(0),
  avgStressLevel: z.number().min(0).max(1),
  avgSpeechPace: z.enum(["fast", "normal", "slow"]),
  // Extended fields from dual-model sidecar
  peakStressLevel: z.number().min(0).max(1).optional(),
  emotionalStateTransitions: z
    .array(
      z.object({
        time: z.string(),
        state: z.enum(["calm", "stressed", "rushed", "uncertain"]),
      })
    )
    .optional(),
  toolCallSummary: z
    .array(
      z.object({
        name: z.string(),
        success: z.boolean(),
        durationMs: z.number(),
      })
    )
    .optional(),
  model: z.string().optional(),
});

const RequestBody = z.discriminatedUnion("action", [
  InitSessionSchema,
  SubmitVoiceSchema,
  EndSessionSchema,
]);

// ── Helpers ─────────────────────────────────────────────────────────

/** Get a Google access token via Token Vault OBO. Returns null on failure. */
async function getGoogleAccessToken(
  refreshToken: string
): Promise<string | null> {
  try {
    const withGoogle = auth0AI.withTokenVault({
      connection: "google-oauth2",
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      refreshToken: async () => refreshToken,
    });

    let accessToken: string | null = null;

    const tokenGrabber = withGoogle(
      tool({
        description: "Get Google access token",
        inputSchema: z.object({}),
        execute: async () => {
          accessToken = getAccessTokenFromTokenVault();
          return { ok: true };
        },
      })
    );

    const executeFn = tokenGrabber.execute as (
      input: Record<string, never>,
      ctx: { toolCallId: string; messages: unknown[] }
    ) => Promise<unknown>;

    await executeFn({} as Record<string, never>, {
      toolCallId: "voice-session-token",
      messages: [],
    });

    return accessToken;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const isDemo = await isDemoSession();
  const session = isDemo ? null : await auth0.getSession();
  if (!isDemo && !session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await request.json();
  const parsed = RequestBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const userId = session?.user.sub ?? "demo-user";

  // ── Init: Create session config + load historical patterns ─────────
  if (parsed.data.action === "init") {
    const geminiSession = createSession({
      languageCode: parsed.data.languageCode,
      voicePreset: parsed.data.voicePreset,
    });

    const setupMessage = buildSetupMessage(geminiSession.config);

    // Load historical sessions from Sheets for pattern detection
    let logs = getSessionLogs(userId); // in-memory cache first
    const refreshToken = session?.tokenSet.refreshToken;

    if (refreshToken) {
      try {
        const accessToken = await getGoogleAccessToken(refreshToken);
        if (accessToken) {
          const sheetsLogs = await readUserSessionsFromSheet(
            userId,
            accessToken
          );
          if (sheetsLogs.length > logs.length) {
            logs = sheetsLogs; // Sheets has more data than memory
          }
        }
      } catch (err) {
        console.warn("[voice] Failed to load Sheets history, using in-memory:", err);
      }
    }

    const patterns = detectPatterns(logs);

    console.log(
      `[voice] Session ${geminiSession.sessionId.slice(0, 8)} initialized — ${logs.length} historical sessions, pattern: ${patterns ? "yes" : "none"}`
    );

    return NextResponse.json({
      sessionId: geminiSession.sessionId,
      config: geminiSession.config,
      setupMessage,
      sessionPattern: patterns,
    });
  }

  // ── Submit: Voice-enriched orchestration ───────────────────────────
  if (parsed.data.action === "submit") {
    const refreshToken = session?.tokenSet.refreshToken;
    if (!refreshToken) {
      return NextResponse.json(
        {
          error: "missing_refresh_token",
          message:
            "Session has no refresh token. Re-login with offline_access scope.",
        },
        { status: 403 }
      );
    }

    setAIContext({ threadID: `voice-${parsed.data.sessionId}` });

    const emotionalState = classifyEmotionalState(parsed.data.voiceMetrics);
    const logs = getSessionLogs(userId);
    const patterns = detectPatterns(logs);

    const voiceContext: VoiceUserContext = {
      emotionalState,
      voiceMetrics: parsed.data.voiceMetrics,
      sessionPattern: patterns ?? undefined,
    };

    const fatigueWarning = parsed.data.sessionDurationMinutes
      ? checkSessionFatigue(
          parsed.data.sessionDurationMinutes,
          parsed.data.errorCount ?? 0
        )
      : null;

    const routeStart = performance.now();
    console.log(
      `[voice] Submit — user: ${userId}, stress: ${parsed.data.voiceMetrics.stressLevel.toFixed(2)}, state: ${emotionalState}, message: "${parsed.data.message.slice(0, 60)}..."`
    );

    try {
      const result = await runOrchestratorAgent(
        parsed.data.message,
        refreshToken,
        userId,
        {
          voiceContext,
          sessionDurationMinutes: parsed.data.sessionDurationMinutes,
        }
      );
      console.log(
        `[voice] Completed in ${Math.round(performance.now() - routeStart)}ms — ${result.changeSet.operations.length} operations`
      );

      return NextResponse.json({
        ...result,
        voiceContext,
        fatigueWarning,
      });
    } catch (err) {
      if (err instanceof TokenVaultInterrupt) {
        return NextResponse.json(
          {
            error: "google_connection_required",
            message:
              "Connect your Google account before using this feature.",
          },
          { status: 403 }
        );
      }
      console.error("[voice] Unhandled error:", err);
      throw err;
    }
  }

  // ── End session: Persist to Sheets + in-memory cache ──────────────
  if (parsed.data.action === "end_session") {
    const now = new Date();
    const dayOfWeek = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ][now.getDay()];

    const extendedLog: ExtendedVoiceSessionLog = {
      userId,
      sessionId: parsed.data.sessionId,
      timestamp: now.toISOString(),
      dayOfWeek,
      hourOfDay: now.getHours(),
      avgStressLevel: parsed.data.avgStressLevel,
      avgSpeechPace: parsed.data.avgSpeechPace,
      operationCount: parsed.data.operationCount,
      operationTypes: parsed.data.operationTypes,
      errorCount: parsed.data.errorCount,
      sessionDurationMinutes: parsed.data.sessionDurationMinutes,
      peakStressLevel: parsed.data.peakStressLevel ?? parsed.data.avgStressLevel,
      emotionalStateTransitions: parsed.data.emotionalStateTransitions ?? [],
      toolCallSummary: parsed.data.toolCallSummary ?? [],
      model: parsed.data.model ?? "unknown",
    };

    // In-memory cache (hot path)
    recordSession(extendedLog);

    // Persist to Google Sheets (non-critical, best-effort)
    const refreshToken = session?.tokenSet.refreshToken;
    if (refreshToken) {
      try {
        const accessToken = await getGoogleAccessToken(refreshToken);
        if (accessToken) {
          await appendSessionToSheet(extendedLog, accessToken);
          console.log(
            `[voice] Session ${parsed.data.sessionId.slice(0, 8)} persisted to Sheets`
          );
        }
      } catch (err) {
        console.warn("[voice] Failed to persist session to Sheets:", err);
      }
    }

    console.log(
      `[voice] Session ${parsed.data.sessionId.slice(0, 8)} ended — ${parsed.data.operationCount} ops, ${parsed.data.sessionDurationMinutes.toFixed(0)}min, stress: ${parsed.data.avgStressLevel.toFixed(2)}, model: ${extendedLog.model}`
    );

    return NextResponse.json({ recorded: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
