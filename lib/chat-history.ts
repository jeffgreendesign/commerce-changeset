/**
 * Chat session persistence via localStorage.
 *
 * Stores up to MAX_SESSIONS chat sessions with debounced auto-save.
 * Each session includes messages, metadata, and a generated title.
 */

// ── Types ────────────────────────────────────────────────────────────

import type { ChangeSet } from "@/lib/changeset/types";
import type { RepetitionSignal } from "@/lib/voice/types";

export interface SerializableMessage {
  role: "user" | "assistant";
  content: string;
  readResult?: string;
  changeSet?: ChangeSet;
  reasoning?: string;
  repetitionSignal?: RepetitionSignal;
  rollbackDraftId?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: SerializableMessage[];
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  preview: string;
}

// ── Constants ────────────────────────────────────────────────────────

const STORAGE_KEY = "commerce-changeset-chat-sessions";
const MAX_SESSIONS = 50;
const MAX_TITLE_LENGTH = 40;

// ── Helpers ──────────────────────────────────────────────────────────

export function generateChatId(): string {
  return crypto.randomUUID();
}

export function generateTitle(firstUserMessage: string): string {
  const cleaned = firstUserMessage.trim().replace(/\n+/g, " ");
  if (cleaned.length <= MAX_TITLE_LENGTH) return cleaned;
  return cleaned.slice(0, MAX_TITLE_LENGTH - 1) + "\u2026";
}

function getPreview(messages: SerializableMessage[]): string {
  const lastAssistant = [...messages]
    .reverse()
    .find((m) => m.role === "assistant");
  if (!lastAssistant) return "";
  const text = lastAssistant.content.trim().replace(/\n+/g, " ");
  return text.length > 60 ? text.slice(0, 59) + "\u2026" : text;
}

// ── Storage operations ───────────────────────────────────────────────

export function loadAllSessions(): ChatSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const sessions: ChatSession[] = JSON.parse(raw);
    return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export function loadSession(id: string): ChatSession | null {
  const sessions = loadAllSessions();
  return sessions.find((s) => s.id === id) ?? null;
}

export function saveChatSession(session: ChatSession): void {
  if (typeof window === "undefined") return;
  try {
    const sessions = loadAllSessions();
    const existingIndex = sessions.findIndex((s) => s.id === session.id);

    if (existingIndex !== -1) {
      sessions[existingIndex] = session;
    } else {
      sessions.unshift(session);
    }

    // Enforce max sessions limit
    const trimmed = sessions
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_SESSIONS);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage might be full or unavailable — silently fail
  }
}

export function deleteChatSession(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const sessions = loadAllSessions().filter((s) => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // Silently fail
  }
}

// ── Session builder ──────────────────────────────────────────────────

export function buildChatSession(
  id: string,
  messages: SerializableMessage[],
  existingTitle?: string,
): ChatSession {
  const firstUserMsg = messages.find((m) => m.role === "user");
  const title =
    existingTitle ??
    (firstUserMsg ? generateTitle(firstUserMsg.content) : "New conversation");

  return {
    id,
    title,
    messages,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messageCount: messages.length,
    preview: getPreview(messages),
  };
}

// ── Debounced save (per-chat) ────────────────────────────────────────

const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function debouncedSave(session: ChatSession, delayMs = 500): void {
  const existing = saveTimers.get(session.id);
  if (existing) clearTimeout(existing);
  saveTimers.set(
    session.id,
    setTimeout(() => {
      saveChatSession(session);
      saveTimers.delete(session.id);
    }, delayMs),
  );
}
