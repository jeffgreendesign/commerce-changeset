/**
 * Voice API route — Gemini Live session management and voice-enriched orchestration.
 *
 * POST /api/voice
 *   Creates a Gemini Live session config and returns session details.
 *   Used by the client to initialize the voice interface.
 *
 * POST /api/voice (with action: "submit")
 *   Submits a voice-transcribed commerce change request with voice context
 *   (stress level, emotional state, speech pace) through the orchestrator.
 */

import { NextResponse } from "next/server";
import { z } from "zod/v4";

import { auth0 } from "@/lib/auth0";
import { setAIContext } from "@auth0/ai-vercel";
import { TokenVaultInterrupt } from "@auth0/ai/interrupts";
import { runOrchestratorAgent } from "@/lib/agents/orchestrator";
import { createSession, buildSetupMessage, classifyEmotionalState } from "@/lib/voice/gemini-live";
import { recordSession, detectPatterns, checkSessionFatigue } from "@/lib/voice/session-insights";
import type { VoiceUserContext } from "@/lib/voice/types";

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
});

const RequestBody = z.discriminatedUnion("action", [
  InitSessionSchema,
  SubmitVoiceSchema,
  EndSessionSchema,
]);

export async function POST(request: Request) {
  const session = await auth0.getSession();
  if (!session) {
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

  const userId = session.user.sub;

  // ── Init: Create a Gemini Live session config ──────────────────────
  if (parsed.data.action === "init") {
    const geminiSession = createSession({
      languageCode: parsed.data.languageCode,
      voicePreset: parsed.data.voicePreset,
    });

    const setupMessage = buildSetupMessage(geminiSession.config);
    const patterns = detectPatterns(userId);

    console.log(`[voice] Session ${geminiSession.sessionId.slice(0, 8)} initialized for user ${userId}`);

    return NextResponse.json({
      sessionId: geminiSession.sessionId,
      config: geminiSession.config,
      setupMessage,
      // Surface any detected behavioral patterns to the client
      sessionPattern: patterns,
    });
  }

  // ── Submit: Voice-enriched orchestration ───────────────────────────
  if (parsed.data.action === "submit") {
    const refreshToken = session.tokenSet.refreshToken;
    if (!refreshToken) {
      return NextResponse.json(
        {
          error: "missing_refresh_token",
          message: "Session has no refresh token. Re-login with offline_access scope.",
        },
        { status: 403 }
      );
    }

    setAIContext({ threadID: `voice-${parsed.data.sessionId}` });

    // Build voice user context from metrics
    const emotionalState = classifyEmotionalState(parsed.data.voiceMetrics);
    const patterns = detectPatterns(userId);

    const voiceContext: VoiceUserContext = {
      emotionalState,
      voiceMetrics: parsed.data.voiceMetrics,
      sessionPattern: patterns ?? undefined,
    };

    // Check for session fatigue
    const fatigueWarning = parsed.data.sessionDurationMinutes
      ? checkSessionFatigue(parsed.data.sessionDurationMinutes, parsed.data.errorCount ?? 0)
      : null;

    const routeStart = performance.now();
    console.log(`[voice] Submit — user: ${userId}, stress: ${parsed.data.voiceMetrics.stressLevel.toFixed(2)}, state: ${emotionalState}, message: "${parsed.data.message.slice(0, 60)}..."`);

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
      console.log(`[voice] Completed in ${Math.round(performance.now() - routeStart)}ms — ${result.changeSet.operations.length} operations`);

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
            message: "Connect your Google account before using this feature.",
          },
          { status: 403 }
        );
      }
      console.error("[voice] Unhandled error:", err);
      throw err;
    }
  }

  // ── End session: Record session log for pattern analysis ───────────
  if (parsed.data.action === "end_session") {
    const now = new Date();

    recordSession({
      userId,
      sessionId: parsed.data.sessionId,
      timestamp: now.toISOString(),
      dayOfWeek: [
        "Sunday", "Monday", "Tuesday", "Wednesday",
        "Thursday", "Friday", "Saturday",
      ][now.getDay()],
      hourOfDay: now.getHours(),
      avgStressLevel: parsed.data.avgStressLevel,
      avgSpeechPace: parsed.data.avgSpeechPace,
      operationCount: parsed.data.operationCount,
      operationTypes: parsed.data.operationTypes,
      errorCount: parsed.data.errorCount,
      sessionDurationMinutes: parsed.data.sessionDurationMinutes,
    });

    console.log(`[voice] Session ${parsed.data.sessionId.slice(0, 8)} ended — ${parsed.data.operationCount} ops, ${parsed.data.sessionDurationMinutes.toFixed(0)}min, stress: ${parsed.data.avgStressLevel.toFixed(2)}`);

    return NextResponse.json({ recorded: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
