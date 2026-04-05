"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
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
import { ArrowDownIcon, XIcon, BrainCircuitIcon, Loader2Icon, ShieldOffIcon } from "lucide-react";
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
import { useLayout } from "@/components/dashboard/layout-shell";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { useDemoAnnotations, ANNOTATIONS } from "@/components/demo/demo-annotation-provider";
import dynamic from "next/dynamic";

const DemoAnnotation = dynamic(() => import("@/components/demo/demo-annotation").then(m => ({ default: m.DemoAnnotation })), { ssr: false });
const DemoInsightBar = dynamic(() => import("@/components/demo/demo-insight-bar").then(m => ({ default: m.DemoInsightBar })), { ssr: false });
const TokenVaultActivity = dynamic(() => import("@/components/demo/token-vault-activity").then(m => ({ default: m.TokenVaultActivity })), { ssr: false });
import { useKeyboardShortcuts } from "@/lib/hooks/use-keyboard-shortcuts";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";
import { useVoice, type ViewToolHandler } from "@/components/dashboard/voice-provider";
import type { ChangeSet } from "@/lib/changeset/types";
import type { ExecuteChangeSetResult } from "@/lib/changeset/executor";
import type { EmotionalState, RepetitionSignal, ProactiveIssue } from "@/lib/voice/types";
import type { PipelinePhase as Phase } from "@/lib/pipeline-phase";
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
  /** True while the message is still being transcribed (interim transcript). */
  interim?: boolean;
}

interface OrchestratorResponse {
  changeSet: ChangeSet | null;
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

/** Show execution feedback (toast + haptic) based on changeset status. */
function showExecutionFeedback(changeSet: ChangeSet) {
  if (changeSet.status === "completed") {
    const passedChecks = changeSet.execution?.receipt.verification.checksPassed ?? 0;
    const totalChecks = changeSet.execution?.receipt.verification.checksRun ?? 0;
    toast.success(
      `Execution complete \u2014 ${passedChecks}/${totalChecks} checks passed`,
    );
    haptic(200);
  } else {
    toast.warning(`Execution finished with status: ${changeSet.status}`);
  }
}


// ── Component ────────────────────────────────────────────────────────

interface ChatProps {
  chatId: string;
}

export function Chat({ chatId }: ChatProps) {
  const { applyExecutedChangeset, reportChatActivity } = useWorkspace();
  const { isDemo } = useLayout();
  const demoAnnotations = useDemoAnnotations();
  // Load persisted session once so all initializers can use it
  const [restoredSession] = useState(() => loadSession(chatId));
  // Don't restore draft state from a denied session — user should start fresh
  const restoreDraft = restoredSession?.phase !== "denied";

  const [messages, setMessages] = useState<Message[]>(() => {
    if (restoredSession?.messages) {
      return restoredSession.messages.map((m) => ({
        role: m.role,
        content: m.content,
        readResult: m.readResult,
        changeSet: m.changeSet,
        reasoning: m.reasoning,
        repetitionSignal: m.repetitionSignal,
        rollbackDraftId: m.rollbackDraftId,
      }));
    }
    return [];
  });
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<Phase>(() => {
    // Restore draft phase if it was mid-workflow; map transient phases to "draft"
    const saved = restoredSession?.phase;
    if (saved === "draft" || saved === "complete") return saved;
    // Transient phases (loading/executing/rolling_back) → resume as draft
    if (saved === "loading" || saved === "executing" || saved === "rolling_back") return "draft";
    // Denied → resume as idle (user can start fresh)
    if (saved === "denied") return "idle";
    return "idle";
  });
  const [error, setError] = useState("");
  const [draftChangeSet, setDraftChangeSet] = useState<ChangeSet | null>(
    () => restoreDraft ? (restoredSession?.draftChangeSet ?? null) : null,
  );
  // Ref mirrors draftChangeSet for synchronous access in voice tool handlers,
  // bypassing stale closures when Gemini batches submit + execute calls.
  const draftChangeSetRef = useRef<ChangeSet | null>(
    restoreDraft ? (restoredSession?.draftChangeSet ?? null) : null,
  );
  const [draftReasoning, setDraftReasoning] = useState(
    () => restoreDraft ? (restoredSession?.draftReasoning ?? "") : "",
  );
  const [activeRollbackId, setActiveRollbackId] = useState<string | null>(null);
  const [cibaApproved, setCibaApproved] = useState(false);
  const [sessionPattern, setSessionPattern] = useState<string | null>(null);
  const [showScrollPill, setShowScrollPill] = useState(false);
  const [patternDismissed, setPatternDismissed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const errorCountRef = useRef(0);
  const voice = useVoice();
  const {
    registerToolHandler,
    unregisterToolHandler,
    registerTranscriptCallbacks,
    unregisterTranscriptCallbacks,
  } = voice;
  const sessionTitleRef = useRef<string | undefined>(restoredSession?.title);
  const createdAtRef = useRef<number | undefined>(restoredSession?.createdAt);
  const isMobile = useIsMobile();

  // Headers for API fetch calls — includes demo signal when in demo/judge mode
  const fetchHeaders = useMemo(() => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (isDemo) h["x-demo-session"] = "1";
    return h;
  }, [isDemo]);

  // Compute active annotations locally to avoid one-render lag from context sync
  const localActiveAnnotations = useMemo(() => {
    if (!demoAnnotations?.enabled) return [];
    return ANNOTATIONS.filter((a) => {
      const phases = Array.isArray(a.phase) ? a.phase : [a.phase];
      return phases.includes(phase);
    });
  }, [phase, demoAnnotations?.enabled]);

  // Sync chat activity to workspace context so the Activity panel can display traces
  useEffect(() => {
    if (phase === "idle" && !draftChangeSet) {
      reportChatActivity("idle", null);
      return;
    }
    const lastMsg = messages[messages.length - 1];
    reportChatActivity(
      phase,
      draftChangeSet ?? lastMsg?.changeSet,
    );
  }, [phase, draftChangeSet, messages, reportChatActivity]);

  // Auto-save messages to localStorage on changes
  useEffect(() => {
    if (messages.length === 0) return;
    const serializable: SerializableMessage[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
      readResult: m.readResult,
      changeSet: m.changeSet,
      reasoning: m.reasoning,
      repetitionSignal: m.repetitionSignal,
      rollbackDraftId: m.rollbackDraftId,
    }));
    const session = buildChatSession(
      chatId,
      serializable,
      sessionTitleRef.current,
      {
        changeSet: draftChangeSet ?? undefined,
        reasoning: draftReasoning || undefined,
        phase,
      },
      createdAtRef.current,
    );
    sessionTitleRef.current = session.title;
    createdAtRef.current = session.createdAt;
    debouncedSave(session);
  }, [messages, chatId, draftChangeSet, draftReasoning, phase]);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: "smooth",
        });
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

  // ── Chat tool handler (registered with VoiceProvider) ──────────────

  const chatToolHandler: ViewToolHandler = useCallback(
    async (name: string, args: Record<string, unknown>) => {
      switch (name) {
        case "submit_commerce_change": {
          const res = await fetch("/api/orchestrator", {
            method: "POST",
            headers: fetchHeaders,
            body: JSON.stringify({ message: args.request }),
          });
          if (!res.ok) throw new Error("Orchestrator request failed");
          const data: OrchestratorResponse = await res.json();
          if (data.changeSet && data.changeSet.operations.length > 0) {
            setDraftChangeSet(data.changeSet);
            draftChangeSetRef.current = data.changeSet;
            setDraftReasoning(data.reasoning);
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: data.reasoning,
                changeSet: data.changeSet ?? undefined,
                reasoning: data.reasoning,
                repetitionSignal: data.repetitionSignal,
              },
            ]);
            setPhase("draft");
          } else {
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: data.reasoning,
                readResult: data.readerText,
              },
            ]);
            setPhase("complete");
          }
          return {
            success: true,
            changesetId: data.changeSet?.id ?? "",
            operationCount: data.changeSet?.operations.length ?? 0,
            reasoning: data.reasoning,
          };
        }
        case "execute_changeset": {
          const cs = draftChangeSetRef.current;
          if (!cs) return { error: "No draft changeset to execute. Call submit_commerce_change first." };
          const requestedId = typeof args.changesetId === "string" ? args.changesetId : undefined;
          if (requestedId && requestedId !== cs.id) {
            return { error: `Changeset ID mismatch: expected ${cs.id}, got ${requestedId}` };
          }
          setPhase("executing");
          const res = await fetch("/api/orchestrator/execute", {
            method: "POST",
            headers: fetchHeaders,
            body: JSON.stringify({ changeSet: cs }),
          });
          if (!res.ok) throw new Error("Execution failed");
          const data: ExecuteChangeSetResult = await res.json();
          if (data.error?.code === "access_denied" || data.changeSet.status === "denied") {
            setMessages((prev) => [...prev, { role: "assistant", content: "Approval was denied. No changes were made.", changeSet: data.changeSet }]);
            setPhase("denied");
            return { success: false, status: "denied", reason: "CIBA approval denied" };
          }
          applyExecutedChangeset(data.changeSet);
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `Execution ${data.changeSet.status === "completed" ? "completed successfully" : "finished: " + data.changeSet.status}.`,
              changeSet: data.changeSet,
            },
          ]);
          setDraftChangeSet(null);
          draftChangeSetRef.current = null;
          setPhase("complete");
          showExecutionFeedback(data.changeSet);
          return { success: true, status: data.changeSet.status };
        }
        case "voice_approve": {
          const cs = draftChangeSetRef.current;
          if (!cs) return { error: "No changeset to approve. Call submit_commerce_change first." };
          const approveId = typeof args.changesetId === "string" ? args.changesetId : undefined;
          if (approveId && approveId !== cs.id) {
            return { error: `Changeset ID mismatch: expected ${cs.id}, got ${approveId}` };
          }
          setPhase("executing");
          const res = await fetch("/api/orchestrator/execute", {
            method: "POST",
            headers: fetchHeaders,
            body: JSON.stringify({ changeSet: cs }),
          });
          if (!res.ok) throw new Error("Approval/execution failed");
          const data: ExecuteChangeSetResult = await res.json();
          if (data.error?.code === "access_denied" || data.changeSet.status === "denied") {
            setMessages((prev) => [...prev, { role: "assistant", content: "Approval was denied. No changes were made.", changeSet: data.changeSet }]);
            setPhase("denied");
            return { approved: false, status: "denied", reason: "CIBA approval denied" };
          }
          applyExecutedChangeset(data.changeSet);
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `Execution ${data.changeSet.status === "completed" ? "completed successfully" : "finished: " + data.changeSet.status}.`,
              changeSet: data.changeSet,
            },
          ]);
          setDraftChangeSet(null);
          draftChangeSetRef.current = null;
          setPhase("complete");
          showExecutionFeedback(data.changeSet);
          return { approved: true, status: data.changeSet.status };
        }
        default:
          return { error: `Unknown tool: ${name}` };
      }
    },
    [applyExecutedChangeset, fetchHeaders],
  );

  // Register chat tool handler + transcript callbacks with VoiceProvider.
  // Destructured registration functions are stable (useCallback with []),
  // so these effects only re-run when the handler/callbacks actually change.
  useEffect(() => {
    registerToolHandler(chatToolHandler);
    return () => unregisterToolHandler(chatToolHandler);
  }, [registerToolHandler, unregisterToolHandler, chatToolHandler]);

  useEffect(() => {
    registerTranscriptCallbacks({
      onUserTranscript: (text: string, finished: boolean) => {
        setMessages((prev) => {
          if (!finished) {
            // Interim: update last in-progress user message or create one
            const last = prev[prev.length - 1];
            if (last?.role === "user" && last.interim) {
              const updated = [...prev];
              updated[updated.length - 1] = { ...last, content: text };
              return updated;
            }
            return [...prev, { role: "user" as const, content: text, interim: true }];
          }
          // Final: replace interim message or push finalized
          const last = prev[prev.length - 1];
          if (last?.role === "user" && last.interim) {
            const updated = [...prev];
            updated[updated.length - 1] = { role: "user", content: text };
            return updated;
          }
          return [...prev, { role: "user" as const, content: text }];
        });
        scrollToBottom();
      },
      onModelTranscript: (text: string, finished: boolean) => {
        setMessages((prev) => {
          if (!finished) {
            // Interim: update last in-progress assistant message or create one
            const last = prev[prev.length - 1];
            if (last?.role === "assistant" && last.interim) {
              const updated = [...prev];
              updated[updated.length - 1] = { ...last, content: text };
              return updated;
            }
            if (last?.role === "assistant" && !last.changeSet && !last.readResult) {
              const updated = [...prev];
              updated[updated.length - 1] = { ...last, content: text, interim: true };
              return updated;
            }
            return [...prev, { role: "assistant" as const, content: text, interim: true }];
          }
          // Final: finalize the interim message
          const last = prev[prev.length - 1];
          if (last?.role === "assistant" && last.interim) {
            const updated = [...prev];
            updated[updated.length - 1] = { role: "assistant", content: text };
            return updated;
          }
          if (last?.role === "assistant" && !last.changeSet && !last.readResult) {
            const updated = [...prev];
            updated[updated.length - 1] = { ...last, content: text };
            return updated;
          }
          return [...prev, { role: "assistant" as const, content: text }];
        });
        scrollToBottom();
      },
    });
    return () => unregisterTranscriptCallbacks();
  }, [registerTranscriptCallbacks, unregisterTranscriptCallbacks, scrollToBottom]);

  const voiceActive = voice.voiceActive;

  const handleSubmit = () => {
    submitMessage(input.trim());
  };

  const handleExecute = async () => {
    if (!draftChangeSet || phase !== "draft") return;

    setPhase("executing");
    setError("");
    setCibaApproved(false);
    scrollToBottom();

    try {
      const res = await fetch("/api/orchestrator/execute", {
        method: "POST",
        headers: fetchHeaders,
        body: JSON.stringify({ changeSet: draftChangeSet }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(
          body.error?.message ?? body.message ?? `Execution failed (${res.status})`
        );
      }

      const data: ExecuteChangeSetResult = await res.json();

      // Handle CIBA denial as a distinct outcome (not an error)
      if (data.error?.code === "access_denied" || data.changeSet.status === "denied") {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Approval was denied. No changes were made.",
            changeSet: data.changeSet,
          },
        ]);
        setPhase("denied");
        toast.warning("CIBA approval denied — no changes were made");
        scrollToBottom();
        return;
      }

      if (data.error) {
        throw new Error(data.error.message);
      }

      // Show approved state before transitioning to complete
      setCibaApproved(true);

      // Brief pause so demo users see the approved state before completion
      if (isDemo) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      applyExecutedChangeset(data.changeSet);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Execution ${data.changeSet.status === "completed" ? "completed successfully" : "finished with status: " + data.changeSet.status}.`,
          changeSet: data.changeSet,
        },
      ]);
      setDraftChangeSet(null); draftChangeSetRef.current = null;
      setPhase("complete");
      showExecutionFeedback(data.changeSet);

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
    setCibaApproved(false);
    setDraftChangeSet(null); draftChangeSetRef.current = null;
    scrollToBottom();

    try {
      // Step 1: Build reversal changeset
      const buildRes = await fetch("/api/orchestrator/rollback", {
        method: "POST",
        headers: fetchHeaders,
        body: JSON.stringify({ changeSet: sourceChangeSet }),
      });

      if (!buildRes.ok) {
        const body = await buildRes.json().catch(() => ({ error: buildRes.statusText }));
        throw new Error(
          body.error?.message ?? body.message ?? `Rollback build failed (${buildRes.status})`
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
        headers: fetchHeaders,
        body: JSON.stringify({ changeSet: rollbackDraft }),
      });

      if (!execRes.ok) {
        const body = await execRes.json().catch(() => ({ error: execRes.statusText }));
        throw new Error(
          body.error?.message ?? body.message ?? `Rollback execution failed (${execRes.status})`
        );
      }

      const execData: ExecuteChangeSetResult = await execRes.json();

      // Handle CIBA denial during rollback
      if (execData.error?.code === "access_denied" || execData.changeSet.status === "denied") {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Approval was denied. No changes were made.",
            changeSet: execData.changeSet,
          },
        ]);
        setActiveRollbackId(null);
        setPhase("denied");
        toast.warning("CIBA approval denied — no changes were made");
        scrollToBottom();
        return;
      }

      if (execData.error) {
        throw new Error(execData.error.message);
      }

      setCibaApproved(true);
      applyExecutedChangeset(execData.changeSet);

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
    setDraftChangeSet(null); draftChangeSetRef.current = null;
    setDraftReasoning("");
    // Pre-fill input with last user message for retry convenience
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMsg) setInput(lastUserMsg.content);
  };

  const isBusy = phase === "loading" || phase === "executing" || phase === "rolling_back";

  const handleVoiceActivate = useCallback(async () => {
    await voice.handleVoiceActivate();
    haptic(50);
    setPatternDismissed(false);
  }, [voice]);

  const handleVoiceDeactivate = useCallback(async () => {
    await voice.handleVoiceDeactivate();
    setSessionPattern(null);
    errorCountRef.current = 0;
    toast.info("Voice mode deactivated");
  }, [voice]);

  // Shared submit helper used by both form submit and command palette
  const submitMessage = useCallback(
    async (prompt: string) => {
      if (!prompt || isBusy) return;

      setInput("");
      setError("");
      setDraftChangeSet(null); draftChangeSetRef.current = null;
      setPhase("loading");

      const userMessage: Message = { role: "user", content: prompt };
      setMessages((prev) => [...prev, userMessage]);
      scrollToBottom();

      try {
        // When voice is active, send typed text to Gemini for tool-call routing
        if (voiceActive) {
          voice.sendText(prompt);
          setPhase("loading");
          // Gemini will handle the response via tool calls + transcripts
          return;
        }

        const res = await fetch("/api/orchestrator", {
          method: "POST",
          headers: fetchHeaders,
          body: JSON.stringify({ message: prompt }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: res.statusText }));
          throw new Error(
            body.error?.message ?? body.message ?? `Request failed (${res.status})`
          );
        }

        const data: OrchestratorResponse = await res.json();

        if (!data.changeSet || data.changeSet.operations.length === 0) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: data.reasoning,
              readResult: data.readerText,
            },
          ]);
          setPhase("complete");
          toast.success("Query complete");
          scrollToBottom();
        } else {
          setDraftChangeSet(data.changeSet);
          draftChangeSetRef.current = data.changeSet;
          setDraftReasoning(data.reasoning);
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: data.reasoning,
              changeSet: data.changeSet ?? undefined,
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
    [isBusy, scrollToBottom, voiceActive, voice, fetchHeaders],
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

  // Consume pending prompt from Quick Actions panel.
  // Use a ref for submitMessage so the effect doesn't re-run when its identity
  // changes (voice context returns a new object each render, making submitMessage
  // unstable). Without this, the cleanup would cancel the timer before it fires.
  const submitMessageRef = useRef(submitMessage);
  submitMessageRef.current = submitMessage;
  const { consumePendingPrompt } = useLayout();
  useEffect(() => {
    const prompt = consumePendingPrompt();
    if (prompt) {
      const timer = setTimeout(() => submitMessageRef.current(prompt), 50);
      return () => clearTimeout(timer);
    }
  }, [consumePendingPrompt]);

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

  const showMobileVoiceDock = isMobile && (voiceActive || voice.voiceConnecting);

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
      <div ref={scrollRef} className="relative flex-1 overflow-y-auto overscroll-contain">
      <div className="mx-auto max-w-4xl px-4 py-4 space-y-4 sm:px-6 sm:space-y-6 lg:px-8 lg:space-y-8">
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
          const hasOps = !!(msg.changeSet && msg.changeSet.operations.length > 0);
          const showInlinePipeline = isLastAssistant && hasOps && phase !== "idle" && phase !== "error";
          const showInlineActivity = isLastAssistant && hasOps && (phase === "loading" || phase === "draft" || phase === "executing" || phase === "rolling_back" || phase === "complete");

          return (
          <div key={i} className="animate-message-enter space-y-3">
            <div
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={cn(
                  "max-w-[90%] rounded-2xl px-4 py-2.5 text-sm sm:max-w-[85%] md:max-w-[80%]",
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

            {/* Token Vault activity — real-time token exchange visibility (demo only, mutations only) */}
            {isLastAssistant && isDemo && hasOps && (
              <TokenVaultActivity phase={phase} />
            )}

            {/* Demo annotations — phase-aware tech callouts (mutations only) */}
            {isDemo && isLastAssistant && hasOps && localActiveAnnotations.length > 0 && (
              <div className="grid gap-2 sm:grid-cols-2">
                {localActiveAnnotations.map((a) => (
                  <DemoAnnotation key={a.id} annotation={a} />
                ))}
              </div>
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
            {/* Only show workflow components when we know this is a write operation */}
            {draftChangeSet && draftChangeSet.operations.length > 0 && (
              <>
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
              </>
            )}
            {isDemo && <TokenVaultActivity phase={phase} />}
            {isDemo && localActiveAnnotations.length > 0 && (
              <div className="grid gap-2 sm:grid-cols-2">
                {localActiveAnnotations.map((a) => (
                  <DemoAnnotation key={a.id} annotation={a} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Skeleton loading when assistant has responded with a draft changeset */}
        {phase === "loading" && messages.length > 0 && messages[messages.length - 1]?.role === "assistant" && draftChangeSet && draftChangeSet.operations.length > 0 && (
          <ChangeSetSkeleton />
        )}

        {/* CIBA approval gate during execution */}
        {phase === "executing" && (
          <CIBAApprovalGate
            isRollback={false}
            timeoutSeconds={isDemo ? 10 : 120}
            approved={cibaApproved}
          />
        )}

        {/* CIBA approval gate during rollback */}
        {phase === "rolling_back" && (
          <CIBAApprovalGate
            isRollback
            timeoutSeconds={isDemo ? 10 : 120}
            approved={cibaApproved}
          />
        )}

        {/* Denial */}
        {phase === "denied" && (
          <div className="animate-message-enter rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 sm:rounded-lg dark:border-amber-900/50 dark:bg-amber-950/50 dark:text-amber-400">
            <div className="flex items-center gap-2">
              <ShieldOffIcon className="size-4 shrink-0" />
              <p className="font-semibold">Approval Denied</p>
            </div>
            <p className="mt-1">
              You denied this changeset via push notification. No changes were made.
              You can modify the request and try again.
            </p>
            {draftChangeSet && draftChangeSet.operations.length > 0 && (
              <div className="mt-2 space-y-1 text-xs text-amber-700 dark:text-amber-400/80">
                <p className="font-medium">Denied operations:</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  {draftChangeSet.operations.filter((op) => op.agent === "writer").map((op) => (
                    <li key={op.id}>{op.action} &mdash; {op.target}</li>
                  ))}
                </ul>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              className="mt-3 min-h-[44px]"
              onClick={handleReset}
            >
              Modify Request
            </Button>
          </div>
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
      </div>

      {/* Execute bar */}
      {phase === "draft" && draftChangeSet && (
        <div className="glass-elevated border-t px-4 py-3 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
            <Button onClick={handleExecute} className="min-h-[44px] w-full sm:w-auto animate-cta-pulse">
              Execute Change Set
              <kbd className="ml-1.5 hidden rounded bg-primary-foreground/20 px-1 py-0.5 text-[10px] font-mono sm:inline">
                {"\u2318\u21B5"}
              </kbd>
            </Button>
          </div>
        </div>
      )}

      {/* Demo insight bar — phase-aware one-liner above input/voice dock */}
      {isDemo && <DemoInsightBar phase={phase} />}

      {/* Mobile voice dock — immersive bottom panel (must be last element) */}
      {showMobileVoiceDock && (
        <VoiceControls
          isActive={voiceActive}
          emotionalState={voice.emotionalState}
          stressLevel={voice.stressLevel}
          inputLevel={voice.inputLevel}
          connectionState={voice.connectionState}
          isSpeaking={voice.isSpeaking}
          sidecarStatus={voice.sidecarStatus}
          disabled={isBusy}
          volume={voice.volume}
          onVolumeChange={voice.setVolume}
          onActivate={handleVoiceActivate}
          onDeactivate={handleVoiceDeactivate}
          mobile
          phase={phase}
          isDemo={isDemo}
        />
      )}

      {/* Input bar — hidden when mobile voice dock is active */}
      {!showMobileVoiceDock && (
        <div className="glass-elevated input-glow border-t px-4 py-4 pb-safe sm:px-6 lg:px-8">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="mx-auto max-w-4xl flex gap-2 sm:gap-3"
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
              emotionalState={voice.emotionalState}
              stressLevel={voice.stressLevel}
              inputLevel={voice.inputLevel}
              connectionState={voice.connectionState}
              isSpeaking={voice.isSpeaking}
              sidecarStatus={voice.sidecarStatus}
              disabled={isBusy}
              volume={voice.volume}
              onVolumeChange={voice.setVolume}
              onActivate={handleVoiceActivate}
              onDeactivate={handleVoiceDeactivate}
              phase={phase}
              isDemo={isDemo}
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
