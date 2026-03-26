"use client";

import { useState, useRef, useCallback } from "react";
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
import { ChangeSetView } from "@/components/changeset/changeset-view";
import { AgentBadge } from "@/components/changeset/agent-badge";
import type { ChangeSet } from "@/lib/changeset/types";
import type { ExecuteChangeSetResult } from "@/lib/changeset/executor";

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
}

type Phase =
  | "idle"
  | "loading"
  | "draft"
  | "executing"
  | "rolling_back"
  | "complete"
  | "error";

// ── Suggested prompts ────────────────────────────────────────────────

const SUGGESTIONS = [
  { label: "Launch spring promo", prompt: "Launch the spring promo for all Stride products" },
  { label: "Discount a product", prompt: "Set a 20% discount on STR-001 Classic Runner" },
  { label: "Activate promo", prompt: "Set promo status to active for STR-002 Court Essential" },
  { label: "Show current prices", prompt: "What are the current prices for all products?" },
];

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

// ── Component ────────────────────────────────────────────────────────

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [draftChangeSet, setDraftChangeSet] = useState<ChangeSet | null>(null);
  const [draftReasoning, setDraftReasoning] = useState("");
  const [activeRollbackId, setActiveRollbackId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  }, []);

  const handleSubmit = async () => {
    const prompt = input.trim();
    if (!prompt || phase === "loading" || phase === "executing" || phase === "rolling_back") return;

    setInput("");
    setError("");
    setDraftChangeSet(null);
    setPhase("loading");

    const userMessage: Message = { role: "user", content: prompt };
    setMessages((prev) => [...prev, userMessage]);
    scrollToBottom();

    try {
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

      const data: { changeSet: ChangeSet; reasoning: string } =
        await res.json();

      if (data.changeSet.operations.length === 0) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Here\u2019s what I found:",
            readResult: data.reasoning,
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
          },
        ]);
        setPhase("draft");
        toast.info(
          `Changeset drafted \u2014 ${data.changeSet.operations.length} operation${data.changeSet.operations.length !== 1 ? "s" : ""}${data.changeSet.riskSummary.requiresCIBA ? ", CIBA approval required" : ""}`,
        );
        scrollToBottom();
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setError(errMsg);
      setPhase("error");
      toast.error(`Request failed: ${errMsg}`);
      scrollToBottom();
    }
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
      toast.success("Rollback completed successfully");
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

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 && phase === "idle" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 pt-24 text-center">
            <p className="text-lg font-medium">
              What commerce changes would you like to make?
            </p>
            <p className="text-sm text-muted-foreground">
              Pick a suggestion or type your own request
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <Button
                  key={s.label}
                  variant="outline"
                  size="sm"
                  onClick={() => setInput(s.prompt)}
                >
                  {s.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className="space-y-3">
            <div
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-4 py-2.5 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
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
              <div className="ml-0 max-w-full rounded-lg border bg-card p-6 text-sm text-card-foreground">
                <Markdown remarkPlugins={[remarkGfm]} components={mdComponents}>{msg.readResult}</Markdown>
              </div>
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
          </div>
        ))}

        {/* Loading states */}
        {phase === "loading" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Analyzing request&hellip;
          </div>
        )}

        {phase === "executing" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Waiting for Guardian approval&hellip;
          </div>
        )}

        {phase === "rolling_back" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Executing rollback &mdash; waiting for Guardian approval&hellip;
          </div>
        )}

        {/* Error */}
        {phase === "error" && error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-400">
            <p className="font-medium">Error</p>
            <p>{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={handleReset}
            >
              Try again
            </Button>
          </div>
        )}
      </div>

      {/* Execute bar — only show when CIBA approval is needed */}
      {phase === "draft" && draftChangeSet && draftChangeSet.riskSummary.requiresCIBA && (
        <div className="border-t bg-muted/50 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <span className="font-medium">
                {draftChangeSet.operations.length} operation
                {draftChangeSet.operations.length !== 1 ? "s" : ""}
              </span>{" "}
              <span className="text-muted-foreground">
                ready &mdash; {draftReasoning.slice(0, 80)}
                {draftReasoning.length > 80 ? "..." : ""}
              </span>
            </div>
            <Button onClick={handleExecute}>Execute Change Set</Button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t px-6 py-4 pb-safe">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="flex gap-3"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe a commerce change..."
            disabled={isBusy}
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={!input.trim() || isBusy}
          >
            Send
          </Button>
        </form>
      </div>
    </div>
  );
}
