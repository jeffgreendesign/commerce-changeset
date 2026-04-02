/**
 * Ephemeral token generation for Gemini Live API.
 *
 * POST /api/voice/token
 *
 * Mints two short-lived ephemeral tokens (1-min connection window, 30-min session):
 *   - primaryToken: for gemini-3.1-flash-live-preview (conversation + tools + audio)
 *   - sidecarToken: for gemini-2.5-flash-native-audio (silent affective analysis)
 *
 * The GEMINI_API_KEY never leaves the server — clients connect using ephemeral tokens.
 */

import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

import { auth0 } from "@/lib/auth0";
import { PRIMARY_MODEL, SIDECAR_MODEL } from "@/lib/voice/gemini-live";
import { isDemoSession } from "@/lib/demo/config.server";

export async function POST() {
  const isDemo = await isDemoSession();

  if (!isDemo) {
    const session = await auth0.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[voice/token] GEMINI_API_KEY is not set");
    return NextResponse.json(
      { error: "Voice features are not configured" },
      { status: 500 }
    );
  }

  const client = new GoogleGenAI({
    apiKey,
    httpOptions: { apiVersion: "v1alpha" },
  });

  // Demo sessions capped at 3 minutes; production gets 30 minutes
  const sessionMinutes = isDemo ? 3 : 30;
  const expireTime = new Date(Date.now() + sessionMinutes * 60_000).toISOString();
  const newSessionExpireTime = new Date(Date.now() + 60_000).toISOString();

  try {
    // No liveConnectConstraints — keep tokens unlocked for debugging
    const [primaryToken, sidecarToken] = await Promise.all([
      client.authTokens.create({
        config: {
          uses: 1,
          expireTime,
          newSessionExpireTime,
        },
      }),
      client.authTokens.create({
        config: {
          uses: 1,
          expireTime,
          newSessionExpireTime,
        },
      }),
    ]);

    console.log(
      `[voice/token] Minted ephemeral tokens (${sessionMinutes}min) for ${isDemo ? "demo user" : "authenticated user"}`
    );

    return NextResponse.json({
      primaryToken: primaryToken.name,
      sidecarToken: sidecarToken.name,
      primaryModel: PRIMARY_MODEL,
      sidecarModel: SIDECAR_MODEL,
    });
  } catch (err) {
    console.error("[voice/token] Failed to mint ephemeral tokens:", err);
    return NextResponse.json(
      { error: "Failed to create voice session tokens" },
      { status: 500 }
    );
  }
}
