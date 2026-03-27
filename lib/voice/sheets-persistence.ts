/**
 * Google Sheets persistence for voice session logs.
 *
 * Uses the same Token Vault OBO pattern as the writer agent.
 * Stores session data in a "Voice Sessions" tab within the existing
 * GOOGLE_SHEET_ID spreadsheet.
 *
 * Sheet columns:
 *   A=userId, B=sessionId, C=timestamp, D=dayOfWeek, E=hourOfDay,
 *   F=avgStressLevel, G=avgSpeechPace, H=operationTypes (JSON),
 *   I=operationCount, J=errorCount, K=sessionDurationMinutes,
 *   L=emotionalStateTransitions (JSON), M=toolCallSummary (JSON),
 *   N=peakStressLevel, O=model
 */

import type { ExtendedVoiceSessionLog, SpeechPace } from "./types";

const SHEET_NAME = "Voice Sessions";

function getSheetId(): string {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) throw new Error("GOOGLE_SHEET_ID env var is not set");
  return sheetId;
}

/**
 * Append a voice session log to the Google Sheets "Voice Sessions" tab.
 *
 * Uses the `:append` endpoint — no need to know the next empty row.
 */
export async function appendSessionToSheet(
  log: ExtendedVoiceSessionLog,
  accessToken: string
): Promise<void> {
  const sheetId = getSheetId();
  const range = `${SHEET_NAME}!A:O`;
  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}:append` +
    `?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const values = [
    [
      log.userId,
      log.sessionId,
      log.timestamp,
      log.dayOfWeek,
      log.hourOfDay,
      log.avgStressLevel,
      log.avgSpeechPace,
      JSON.stringify(log.operationTypes),
      log.operationCount,
      log.errorCount,
      log.sessionDurationMinutes,
      JSON.stringify(log.emotionalStateTransitions),
      JSON.stringify(log.toolCallSummary),
      log.peakStressLevel,
      log.model,
    ],
  ];

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google Sheets API append ${res.status}: ${body}`);
  }
}

/**
 * Read all voice session logs for a specific user from Google Sheets.
 */
export async function readUserSessionsFromSheet(
  userId: string,
  accessToken: string
): Promise<ExtendedVoiceSessionLog[]> {
  const all = await readAllSessionsFromSheet(accessToken);
  return all.filter((log) => log.userId === userId);
}

/**
 * Read all voice session logs from Google Sheets (all users).
 */
export async function readAllSessionsFromSheet(
  accessToken: string
): Promise<ExtendedVoiceSessionLog[]> {
  const sheetId = getSheetId();
  const range = `${SHEET_NAME}!A:O`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google Sheets API GET ${res.status}: ${body}`);
  }

  const data: { values?: string[][] } = await res.json();
  const rows = data.values ?? [];

  // Skip header row (if present)
  const dataRows = rows.length > 0 && rows[0][0] === "userId" ? rows.slice(1) : rows;

  return dataRows
    .filter((row) => row.length >= 11) // minimum required columns
    .map((row) => ({
      userId: row[0] ?? "",
      sessionId: row[1] ?? "",
      timestamp: row[2] ?? "",
      dayOfWeek: row[3] ?? "",
      hourOfDay: parseInt(row[4] ?? "0", 10),
      avgStressLevel: parseFloat(row[5] ?? "0"),
      avgSpeechPace: (row[6] ?? "normal") as SpeechPace,
      operationTypes: safeParseJSON<string[]>(row[7], []),
      operationCount: parseInt(row[8] ?? "0", 10),
      errorCount: parseInt(row[9] ?? "0", 10),
      sessionDurationMinutes: parseFloat(row[10] ?? "0"),
      emotionalStateTransitions: safeParseJSON(row[11], []),
      toolCallSummary: safeParseJSON(row[12], []),
      peakStressLevel: parseFloat(row[13] ?? "0"),
      model: row[14] ?? "unknown",
    }));
}

function safeParseJSON<T>(value: string | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
