"use client";

import { useState, useRef, useCallback, useEffect, useSyncExternalStore } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { ArrowDownIcon, XIcon, BrainCircuitIcon, Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChangeSetView } from "@/components/changeset/changeset-view";
import { ChangeSetSkeleton } from "@/components/changeset/changeset-skeleton";
import { AgentBadge } from "@/components/changeset/agent-badge";
import { ProductDataView } from "@/components/dashboard/product-data-view";
import { WorkflowPipeline } from "@/components/dashboard/workflow-pipeline";
import { CIBAApprovalGate } from "@/components/dashboard/ciba-approval-gate";
import { AgentActivity } from "@/components/dashboard/agent-activity";
import { IntentCards } from "@/components/dashboard/intent-cards";
import { CommandPalette } from "@/components/dashboard/command-palette";
import { VoiceControls } from "@/components/dashboard/voice-controls";
import { BulkSuggestionCard } from "@/components/dashboard/bulk-suggestion-card";
import { ProactiveIssuesCard } from "@/components/dashboard/proactive-issues-card";
import { useKeyboardShortcuts } from "@/lib/hooks/use-keyboard-shortcuts";
import { useGeminiLive } from "@/lib/hooks/use-gemini-live";
import type { ChangeSet } from "@/lib/changeset/types";
import type { ExecuteChangeSetResult } from "@/lib/changeset/executor";
import type { EmotionalState, RepetitionSignal, ProactiveIssue } from "@/lib/voice/types";
import {
  loadSession,
  buildChatSession,
  debouncedSave,
  type SerializableMessage,
} from "@/lib/chat-history";

// ── Types ────────────────────────────────────────────────────────────

interface Message {
  role: "user" | "assistant";
  content: string;
  changeSet?: ChangeSet;
  reasoning?: string;
  /** Markdown content from reader agent for read-only queries. */
  readResult?: string;
  /** Unique key for locating rollback draft messages during state updates. */
  rollbackDraftId?: string;
  /** Repetition signal if the orchestrator detected a repetitive workflow. */
  repetitionSignal?: RepetitionSignal;
}

type Phase =
  | "idle"
  | "loading"
  | "draft"
  | "executing"
  | "rolling_back"
  | "complete"
  | "error";

interface OrchestratorResponse {
  changeSet: ChangeSet;
  reasoning: string;
  /** Formatted product/schedule data from the Reader Agent (read-only queries). */
  readerText?: string;
  repetitionSignal?: RepetitionSignal;
  voiceContext?: {
    emotionalState: EmotionalState;
    voiceMetrics: { stressLevel: number; pace?: "fast" | "normal" | "slow" };
  };
  fatigueWarning?: string;
}

// ── (Suggested prompts moved to IntentCards component) ───────────────

// ── Markdown → shadcn table mapping ──────────────────────────────────

const mdComponents = {
  // Tables → shadcn
  table: ({ children }: React.ComponentProps<"table">) => (
    <div className="my-4 rounded-md border">
      <Table>{children}</Table>
    </div>
  ),
  thead: ({ children }: React.ComponentProps<"thead">) => <TableHeader>{children}</TableHeader>,
  tbody: ({ children }: React.ComponentProps<"tbody">) => <TableBody>{children}</TableBody>,
  tr: ({ children }: React.ComponentProps<"tr">) => <TableRow>{children}</TableRow>,
  th: ({ children }: React.ComponentProps<"th">) => <TableHead>{children}</TableHead>,
  td: ({ children }: React.ComponentProps<"td">) => <TableCell>{children}</TableCell>,
  // Typography
  h2: ({ children }: React.ComponentProps<"h2">) => (
    <h2 className="mt-6 mb-2 text-base font-semibold tracking-tight first:mt-0">{children}</h2>
  ),
  h3: ({ children }: React.ComponentProps<"h3">) => (
    <h3 className="mt-4 mb-2 text-sm font-semibold tracking-tight">{children}</h3>
  ),
  p: ({ children }: React.ComponentProps<"p">) => (
    <p className="mb-2 leading-relaxed last:mb-0">{children}</p>
  ),
  ul: ({ children }: React.ComponentProps<"ul">) => (
    <ul className="mb-2 list-disc pl-5 space-y-1">{children}</ul>
  ),
  ol: ({ children }: React.ComponentProps<"ol">) => (
    <ol className="mb-2 list-decimal pl-5 space-y-1">{children}</ol>
  ),
  li: ({ children }: React.ComponentProps<"li">) => (
    <li className="leading-relaxed">{children}</li>
  ),
};

// ── Helpers ─────────────────────────────────────────────────────────

/** Fire haptic feedback on mobile devices. Gracefully no-ops on desktop. */
function haptic(pattern: number | number[]) {
  try {
    navigator?.vibrate?.(pattern);
  } catch {
    // Not supported — no-op
  }
}

/** Detect mobile viewport via matchMedia (SSR-safe). */
const mobileSubscribe = (cb: () => void) => {
  const mql = window.matchMedia("(max-width: 639px)");
  mql.addEventListener("change", cb);
  return () => mql.removeEventListener("change", cb);
};
const mobileSnapshot = () => window.matchMedia("(max-width: 639px)").matches;
const mobileServerSnapshot = () => false;

function useIsMobile() {
  return useSyncExternalStore(mobileSubscribe, mobileSnapshot, mobileServerSnapshot);
}

// ── Component ────────────────────────────────────────────────────────

interface ChatProps {
  chatId: string;
}

export function Chat({ chatId }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>(() => {
    // Load persisted messages on mount
    const session = loadSession(chatId);
    if (session?.messages) {
      return session.messages.map((m) => ({
        role: m.role,
        content: m.content,
        readResult: m.readResult,
      }));
    }
    return [];
  });
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<Phase>(() => {
    // If we loaded messages, start in idle (not loading)
    return "idle";
  });
  const [error, setError] = useState("");
  const [draftChangeSet, setDraftChangeSet] = useState<ChangeSet | null>(null);
  const [draftReasoning, setDraftReasoning] = useState("");
  const [activeRollbackId, setActiveRollbackId] = useState<string | null>(null);
  const [sessionPattern, setSessionPattern] = useState<string | null>(null);
  const [showScrollPill, setShowScrollPill] = useState(false);
  const [patternDismissed, setPatternDismissed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const voiceStartTimeRef = useRef<number>(0);
  const errorCountRef = useRef(0);
  const sessionTitleRef = useRef<string | undefined>(undefined);
  const isMobile = useIsMobile();

  // Auto-save messages to localStorage on changes
  useEffect(() => {
    if (messages.length === 0) return;
    const serializable: SerializableMessage[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
      readResult: m.readResult,
    }));
    const session = buildChatSession(chatId, serializable, sessionTitleRef.current);
    sessionTitleRef.current = session.title;
    debouncedSave(session);
  }, [messages, chatId]);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  }, []);

  // Track scroll position for "scroll to latest" pill
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handler = () => {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
      setShowScrollPill(!atBottom && messages.length > 0);
    };
    el.addEventListener("scroll", handler, { passive: true });
    return () => el.removeEventListener("scroll", handler);
  }, [messages.length]);

  // ── Gemini Live voice (dual-model sidecar) ─────────────────────────

  const handleGeminiToolCall = useCallback(
    async (name: string, args: Record<string, unknown>) => {
      switch (name) {
        case "submit_commerce_change": {
          const res = await fetch("/api/orchestrator", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: args.request }),
          });
          if (!res.ok) throw new Error("Orchestrator request failed");
          const data: OrchestratorResponse = await res.json();
          if (data.changeSet.operations.length > 0) {
            setDraftChangeSet(data.changeSet);
            setDraftReasoning(data.reasoning);
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: data.reasoning,
                changeSet: data.changeSet,
                reasoning: data.reasoning,
                repetitionSignal: data.repetitionSignal,
              },
            ]);
            setPhase("draft");
          } else {
            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: "Here\u2019s what I found:", readResult: data.readerText ?? data.reasoning },
            ]);
            setPhase("complete");
          }
          return {
            success: true,
            operationCount: data.changeSet.operations.length,
            reasoning: data.reasoning,
          };
        }
        case "execute_changeset": {
          if (!draftChangeSet) return { error: "No draft changeset to execute" };
          setPhase("executing");
          const res = await fetch("/api/orchestrator/execute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ changeSet: draftChangeSet }),
          });
          if (!res.ok) throw new Error("Execution failed");
          const data: ExecuteChangeSetResult = await res.json();
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `Execution ${data.changeSet.status === "completed" ? "completed successfully" : "finished: " + data.changeSet.status}.`,
              changeSet: data.changeSet,
            },
          ]);
          setDraftChangeSet(null);
          setPhase("complete");
          return { success: true, status: data.changeSet.status };
        }
        case "query_product_data": {
          const res = await fetch("/api/reader", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: args.query }),
          });
          if (!res.ok) throw new Error("Reader request failed");
          const data = (await res.json()) as { text: string };
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: "Here\u2019s what I found:", readResult: data.text },
          ]);
          return { data: data.text };
        }
        case "voice_approve": {
          // Voice approval — trigger execution with CIBA
          if (!draftChangeSet) return { error: "No changeset to approve" };
          setPhase("executing");
          const res = await fetch("/api/orchestrator/execute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ changeSet: draftChangeSet }),
          });
          if (!res.ok) throw new Error("Approval/execution failed");
          const data: ExecuteChangeSetResult = await res.json();
          setDraftChangeSet(null);
          setPhase("complete");
          return { approved: true, status: data.changeSet.status };
        }
        default:
          return { error: `Unknown tool: ${name}` };
      }
    },
    [draftChangeSet]
  );

  const handleUserTranscript = useCallback(
    (text: string) => {
      console.log("[chat] Adding user transcript to messages:", text);
      setMessages((prev) => {
        const next = [...prev, { role: "user" as const, content: text }];
        console.log("[chat] Messages count:", next.length);
        return next;
      });
      scrollToBottom();
    },
    [scrollToBottom]
  );

  const handleModelTranscript = useCallback(
    (text: string) => {
      console.log("[chat] Adding model transcript to messages:", text);
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && !last.changeSet && !last.readResult) {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...last,
            content: last.content + text,
          };
          return updated;
        }
        return [...prev, { role: "assistant" as const, content: text }];
      });
      scrollToBottom();
    },
    [scrollToBottom]
  );

  const geminiLive = useGeminiLive({
    onToolCall: handleGeminiToolCall,
    onUserTranscript: handleUserTranscript,
    onModelTranscript: handleModelTranscript,
    onError: (msg) => toast.error(`Voice error: ${msg}`),
  });

  const voiceActive = geminiLive.connectionState === "connected";

  const handleSubmit = () => {
    submitMessage(input.trim());
  };

  const handleExecute = async () => {
    if (!draftChangeSet || phase !== "draft") return;

    setPhase("executing");
    setError("");
    scrollToBottom();

    try {
      const res = await fetch("/api/orchestrator/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changeSet: draftChangeSet }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(
          body.message ?? body.error ?? `Execution failed (${res.status})`
        );
      }

      const data: ExecuteChangeSetResult = await res.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Execution ${data.changeSet.status === "completed" ? "completed successfully" : "finished with status: " + data.changeSet.status}.`,
          changeSet: data.changeSet,
        },
      ]);
      setDraftChangeSet(null);
      setPhase("complete");

      if (data.changeSet.status === "completed") {
        const passedChecks = data.changeSet.execution?.receipt.verification.checksPassed ?? 0;
        const totalChecks = data.changeSet.execution?.receipt.verification.checksRun ?? 0;
        toast.success(
          `Execution complete \u2014 ${passedChecks}/${totalChecks} checks passed`,
        );
        haptic(200); // Long pulse on execution complete
      } else {
        toast.warning(`Execution finished with status: ${data.changeSet.status}`);
      }

      scrollToBottom();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase("error");
      scrollToBottom();
    }
  };

  const handleRollback = async (messageIndex: number) => {
    if (isBusy) return;

    const sourceMessage = messages[messageIndex];
    const sourceChangeSet = sourceMessage?.changeSet;
    if (!sourceChangeSet) return;

    // Capture stable identifiers in the closure — do not rely on state
    // indices which can shift if messages update concurrently.
    const sourceId = sourceChangeSet.id;

    setPhase("rolling_back");
    setActiveRollbackId(sourceId);
    setError("");
    setDraftChangeSet(null);
    scrollToBottom();

    try {
      // Step 1: Build reversal changeset
      const buildRes = await fetch("/api/orchestrator/rollback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changeSet: sourceChangeSet }),
      });

      if (!buildRes.ok) {
        const body = await buildRes.json().catch(() => ({ error: buildRes.statusText }));
        throw new Error(
          body.message ?? body.error ?? `Rollback build failed (${buildRes.status})`
        );
      }

      const { changeSet: rollbackDraft } = (await buildRes.json()) as {
        changeSet: ChangeSet;
      };

      // Step 2: Show the reversal draft, tagged so we can find it later
      const draftId = rollbackDraft.id;
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Reversal changeset generated for ${sourceChangeSet.id.slice(0, 8)}. Executing rollback\u2026`,
          changeSet: rollbackDraft,
          rollbackDraftId: draftId,
        },
      ]);
      toast.info("Rollback initiated \u2014 executing reversal\u2026");
      scrollToBottom();

      // Step 3: Execute the reversal through the standard pipeline
      const execRes = await fetch("/api/orchestrator/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changeSet: rollbackDraft }),
      });

      if (!execRes.ok) {
        const body = await execRes.json().catch(() => ({ error: execRes.statusText }));
        throw new Error(
          body.message ?? body.error ?? `Rollback execution failed (${execRes.status})`
        );
      }

      const execData: ExecuteChangeSetResult = await execRes.json();

      if (execData.error) {
        throw new Error(execData.error.message);
      }

      // Step 4: Update messages — conditionally mark original, replace draft
      setMessages((prev) => {
        const updated = [...prev];

        // Only mark the original as rolled_back if the rollback fully succeeded
        if (execData.changeSet.status === "completed") {
          const sourceIdx = updated.findIndex(
            (m) => m.changeSet?.id === sourceId
          );
          if (sourceIdx !== -1 && updated[sourceIdx].changeSet) {
            updated[sourceIdx] = {
              ...updated[sourceIdx],
              changeSet: {
                ...updated[sourceIdx].changeSet!,
                status: "rolled_back" as const,
              },
            };
          }
        }

        // Find the draft message by its tagged ID, not array position
        const draftIdx = updated.findIndex(
          (m) => m.rollbackDraftId === draftId
        );
        if (draftIdx !== -1) {
          updated[draftIdx] = {
            role: "assistant",
            content: `Rollback ${execData.changeSet.status === "completed" ? "completed successfully" : "finished with status: " + execData.changeSet.status}.`,
            changeSet: execData.changeSet,
          };
        } else {
          updated.push({
            role: "assistant",
            content: `Rollback ${execData.changeSet.status === "completed" ? "completed successfully" : "finished with status: " + execData.changeSet.status}.`,
            changeSet: execData.changeSet,
          });
        }

        return updated;
      });

      setPhase("complete");
      setActiveRollbackId(null);
      if (execData.changeSet.status === "completed") {
        toast.success("Rollback completed successfully");
      } else {
        toast.warning(`Rollback finished with status: ${execData.changeSet.status}`);
      }
      scrollToBottom();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setError(errMsg);
      setPhase("error");
      setActiveRollbackId(null);
      toast.error(`Rollback failed: ${errMsg}`);
      scrollToBottom();
    }
  };

  const handleReset = () => {
    setPhase("idle");
    setError("");
    setDraftChangeSet(null);
    setDraftReasoning("");
  };

  const isBusy = phase === "loading" || phase === "executing" || phase === "rolling_back";

  // ── Voice mode handlers ────────────────────────────────────────────

  const handleVoiceActivate = useCallback(async () => {
    voiceStartTimeRef.current = Date.now();

    // Init server-side session logging + pattern detection
    try {
      const res = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "init" }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.sessionPattern) {
          setSessionPattern(data.sessionPattern.description);
          toast.info(data.sessionPattern.description, { duration: 8000 });
        }
      }
    } catch {
      // Non-critical — pattern detection failure shouldn't block voice
    }

    // Connect to Gemini Live (mic + dual WebSocket)
    await geminiLive.connect();
    haptic(50); // Short pulse on connection
    setPatternDismissed(false);
  }, [geminiLive]);

  const handleVoiceDeactivate = useCallback(async () => {
    geminiLive.disconnect();

    // Log session to server (for Sheets persistence + pattern analysis)
    const durationMinutes = (Date.now() - voiceStartTimeRef.current) / 60000;
    try {
      await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "end_session",
          sessionId: crypto.randomUUID(),
          sessionDurationMinutes: durationMinutes,
          operationCount: messages.reduce(
            (acc, m) => acc + (m.changeSet?.operations.length ?? 0),
            0
          ),
          operationTypes: messages.flatMap(
            (m) => m.changeSet?.operations.map((o) => o.action) ?? []
          ),
          errorCount: errorCountRef.current,
          avgStressLevel: geminiLive.stressLevel,
          avgSpeechPace: geminiLive.voiceMetrics.pace,
          peakStressLevel: geminiLive.peakStressLevel,
          emotionalStateTransitions: geminiLive.emotionalStateTransitions,
          toolCallSummary: geminiLive.toolCallOutcomes,
          model: geminiLive.sidecarStatus.connected
            ? "3.1-primary+2.5-sidecar"
            : "3.1-primary-only",
        }),
      });
    } catch {
      // Non-critical
    }

    setSessionPattern(null);
    errorCountRef.current = 0;
    toast.info("Voice mode deactivated");
  }, [geminiLive, messages]);

  // Shared submit helper used by both form submit and command palette
  const submitMessage = useCallback(
    async (prompt: string) => {
      if (!prompt || isBusy) return;

      setInput("");
      setError("");
      setDraftChangeSet(null);
      setPhase("loading");

      const userMessage: Message = { role: "user", content: prompt };
      setMessages((prev) => [...prev, userMessage]);
      scrollToBottom();

      try {
        // When voice is active, send typed text to Gemini for tool-call routing
        if (voiceActive) {
          geminiLive.sendText(prompt);
          setPhase("loading");
          // Gemini will handle the response via tool calls + transcripts
          return;
        }

        const res = await fetch("/api/orchestrator", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: prompt }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: res.statusText }));
          throw new Error(
            body.message ?? body.error ?? `Request failed (${res.status})`
          );
        }

        const data: OrchestratorResponse = await res.json();

        if (data.changeSet.operations.length === 0) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: "Here\u2019s what I found:",
              readResult: data.readerText ?? data.reasoning,
            },
          ]);
          setPhase("complete");
          toast.success("Query complete");
          scrollToBottom();
        } else {
          setDraftChangeSet(data.changeSet);
          setDraftReasoning(data.reasoning);
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: data.reasoning,
              changeSet: data.changeSet,
              reasoning: data.reasoning,
              repetitionSignal: data.repetitionSignal,
            },
          ]);
          setPhase("draft");
          toast.info(
            `Changeset drafted \u2014 ${data.changeSet.operations.length} operation${data.changeSet.operations.length !== 1 ? "s" : ""}${data.changeSet.riskSummary.requiresCIBA ? ", CIBA approval required" : ""}`,
          );
          haptic([50, 50, 50]); // Double pulse on draft
          scrollToBottom();
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        setError(errMsg);
        setPhase("error");
        errorCountRef.current += 1;
        toast.error(`Request failed: ${errMsg}`);
        scrollToBottom();
      }
    },
    [isBusy, scrollToBottom, voiceActive, geminiLive],
  );

  const handleApplyFix = useCallback(
    (issue: ProactiveIssue) => {
      if (isBusy || !issue.suggestedFix) return;
      const { action, target, field, suggestedValue } = issue.suggestedFix;
      submitMessage(
        `Apply fix: ${action} on ${target} — set ${field} to ${String(suggestedValue)}`
      );
    },
    [submitMessage, isBusy]
  );

  const handleBulkAccept = useCallback(
    (selectedRows: { sku: string; productName: string; currentPrice: string | number; proposedPrice: string | number; field: string }[]) => {
      if (isBusy) return;
      const skuList = selectedRows.map((r) => r.sku).join(", ");
      submitMessage(`Apply bulk price change to: ${skuList}`);
    },
    [submitMessage, isBusy]
  );

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onSubmit: () => {
      if (phase === "draft" && draftChangeSet) {
        handleExecute();
      } else if (input.trim() && !isBusy) {
        handleSubmit();
      }
    },
  });

  const showMobileVoiceDock = isMobile && (voiceActive || geminiLive.connectionState === "connecting");

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Command Palette (Cmd+K) */}
      <CommandPalette onSubmitPrompt={submitMessage} />

      {/* Session pattern card — top of chat, frosted glass */}
      {voiceActive && sessionPattern && !patternDismissed && (
        <div className="glass-subtle animate-slide-down-fade border-b px-4 py-3 sm:px-6">
          <div className="flex items-start gap-3">
            <BrainCircuitIcon className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="flex-1 text-sm text-amber-800 dark:text-amber-300">
              {sessionPattern}
            </p>
            <button
              onClick={() => setPatternDismissed(true)}
              className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground"
              aria-label="Dismiss"
            >
              <XIcon className="size-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="relative flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-4 sm:p-6 sm:space-y-6">
        {messages.length === 0 && phase === "idle" && (
          <IntentCards
            onSelect={submitMessage}
            onVoiceActivate={handleVoiceActivate}
            voiceAvailable
          />
        )}

        {messages.map((msg, i) => {
          const isLast = i === messages.length - 1;
          const isLastAssistant = isLast && msg.role === "assistant";
          const showInlinePipeline = isLastAssistant && phase !== "idle" && phase !== "error";
          const showInlineActivity = isLastAssistant && (phase === "loading" || phase === "executing" || phase === "rolling_back" || phase === "complete");

          return (
          <div key={i} className="animate-message-enter space-y-3">
            <div
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={cn(
                  "max-w-[90%] rounded-2xl px-4 py-2.5 text-sm sm:max-w-[85%] sm:rounded-lg",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "border-l-2 border-emerald-500/40 bg-muted/60 dark:border-emerald-400/30",
                )}
              >
                {msg.content}
              </div>
            </div>

            {msg.changeSet && msg.changeSet.operations.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <span>Tools invoked:</span>
                {Array.from(
                  new Set(
                    msg.changeSet.operations.map(
                      (op) => `${op.agent}:${op.action}`,
                    ),
                  ),
                ).map((key) => {
                  const [agent, action] = key.split(":");
                  return (
                    <span key={key} className="inline-flex items-center gap-1">
                      <AgentBadge agent={agent} />
                      <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
                        {action}
                      </code>
                    </span>
                  );
                })}
              </div>
            )}

            {msg.readResult && (
              <div className="ml-0 max-w-full rounded-xl border bg-card p-4 text-sm text-card-foreground sm:rounded-lg sm:p-6">
                <ProductDataView markdown={msg.readResult} />
                <Markdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                  {msg.readResult.replace(/\|[^\n]*\|(\n\|[^\n]*\|)*/g, "").trim()}
                </Markdown>
              </div>
            )}

            {/* Proactive issues detected by voice-enriched pipeline */}
            {msg.changeSet?.proactiveIssues && msg.changeSet.proactiveIssues.length > 0 && (
              <ProactiveIssuesCard
                issues={msg.changeSet.proactiveIssues}
                onApplyFix={handleApplyFix}
                disabled={isBusy}
              />
            )}

            {/* Bulk suggestion from repetition detection */}
            {msg.repetitionSignal?.isRepetitive && (
              <BulkSuggestionCard
                signal={msg.repetitionSignal}
                onAccept={handleBulkAccept}
                onDismiss={() => {
                  setMessages((prev) =>
                    prev.map((m, idx) =>
                      idx === i ? { ...m, repetitionSignal: undefined } : m
                    )
                  );
                }}
                disabled={isBusy}
              />
            )}

            {msg.changeSet && (
              <div className="ml-0 max-w-full">
                <ChangeSetView
                  changeSet={msg.changeSet}
                  onRollback={() => handleRollback(i)}
                  isRollingBack={phase === "rolling_back" && activeRollbackId === msg.changeSet.id}
                  disabled={isBusy}
                />
              </div>
            )}

            {/* Inline pipeline + agent activity for the last assistant message */}
            {showInlinePipeline && (
              <WorkflowPipeline
                phase={phase}
                requiresCIBA={
                  draftChangeSet?.riskSummary.requiresCIBA ??
                  msg.changeSet?.riskSummary.requiresCIBA ??
                  false
                }
              />
            )}
            {showInlineActivity && (
              <AgentActivity
                phase={phase}
                requiresCIBA={
                  draftChangeSet?.riskSummary.requiresCIBA ??
                  msg.changeSet?.riskSummary.requiresCIBA ??
                  false
                }
                operationCount={
                  draftChangeSet?.operations.length ??
                  msg.changeSet?.operations.length ??
                  0
                }
                results={msg.changeSet?.execution?.results}
              />
            )}
          </div>
          );
        })}

        {/* Thinking state — shown during loading before assistant responds */}
        {phase === "loading" && messages.length > 0 && messages[messages.length - 1]?.role === "user" && (
          <div className="animate-message-enter space-y-3">
            <div className="flex justify-start">
              <div className="border-l-2 border-emerald-500/40 bg-muted/60 dark:border-emerald-400/30 rounded-2xl px-4 py-2.5 text-sm sm:rounded-lg">
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <Loader2Icon className="size-3.5 animate-spin" />
                  Analyzing your request...
                </span>
              </div>
            </div>
            <WorkflowPipeline
              phase={phase}
              requiresCIBA={false}
            />
            <AgentActivity
              phase={phase}
              requiresCIBA={false}
              operationCount={0}
            />
            <ChangeSetSkeleton />
          </div>
        )}

        {/* Skeleton loading when assistant has already started responding */}
        {phase === "loading" && messages.length > 0 && messages[messages.length - 1]?.role === "assistant" && (
          <ChangeSetSkeleton />
        )}

        {/* CIBA approval gate during execution */}
        {phase === "executing" && (
          <CIBAApprovalGate isRollback={false} />
        )}

        {/* CIBA approval gate during rollback */}
        {phase === "rolling_back" && (
          <CIBAApprovalGate isRollback />
        )}

        {/* Error */}
        {phase === "error" && error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:rounded-lg dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-400">
            <p className="font-medium">Error</p>
            <p>{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 min-h-[44px]"
              onClick={handleReset}
            >
              Try again
            </Button>
          </div>
        )}

        {/* Scroll-to-latest floating pill */}
        {showScrollPill && (
          <button
            onClick={scrollToBottom}
            className="glass sticky bottom-2 left-1/2 z-10 -translate-x-1/2 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-lg transition-all hover:text-foreground active:scale-95"
          >
            <ArrowDownIcon className="size-3" />
            Latest
          </button>
        )}
      </div>

      {/* Execute bar */}
      {phase === "draft" && draftChangeSet && (
        <div className="glass border-t px-4 py-3 sm:px-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm">
              <span className="font-medium">
                {draftChangeSet.operations.length} operation
                {draftChangeSet.operations.length !== 1 ? "s" : ""}
              </span>{" "}
              <span className="hidden text-muted-foreground sm:inline">
                ready &mdash; {draftReasoning.slice(0, 80)}
                {draftReasoning.length > 80 ? "..." : ""}
              </span>
              <span className="text-muted-foreground sm:hidden"> ready</span>
            </div>
            <Button onClick={handleExecute} className="min-h-[44px] w-full sm:w-auto">
              Execute Change Set
              <kbd className="ml-1.5 hidden rounded bg-primary-foreground/20 px-1 py-0.5 text-[10px] font-mono sm:inline">
                {"\u2318\u21B5"}
              </kbd>
            </Button>
          </div>
        </div>
      )}

      {/* Mobile voice dock — immersive bottom panel */}
      {showMobileVoiceDock && (
        <VoiceControls
          isActive={voiceActive}
          emotionalState={geminiLive.emotionalState}
          stressLevel={geminiLive.stressLevel}
          inputLevel={geminiLive.inputLevel}
          connectionState={geminiLive.connectionState}
          isSpeaking={geminiLive.isSpeaking}
          sidecarStatus={geminiLive.sidecarStatus}
          disabled={isBusy}
          onActivate={handleVoiceActivate}
          onDeactivate={handleVoiceDeactivate}
          mobile
        />
      )}

      {/* Input bar — hidden when mobile voice dock is active */}
      {!showMobileVoiceDock && (
        <div className="glass border-t px-4 py-3 pb-safe sm:px-6 sm:py-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="flex gap-2 sm:gap-3"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={voiceActive ? "Listening... or type here" : "Describe a commerce change..."}
              disabled={isBusy}
              className="flex-1"
            />
            <VoiceControls
              isActive={voiceActive}
              emotionalState={geminiLive.emotionalState}
              stressLevel={geminiLive.stressLevel}
              inputLevel={geminiLive.inputLevel}
              connectionState={geminiLive.connectionState}
              isSpeaking={geminiLive.isSpeaking}
              sidecarStatus={geminiLive.sidecarStatus}
              disabled={isBusy}
              onActivate={handleVoiceActivate}
              onDeactivate={handleVoiceDeactivate}
            />
            <Button
              type="submit"
              disabled={!input.trim() || isBusy}
              className="min-h-[44px] min-w-[44px]"
            >
              <span className="hidden sm:inline">Send</span>
              <span className="sm:hidden">Go</span>
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
