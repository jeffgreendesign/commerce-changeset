"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChangeSetView } from "@/components/changeset/changeset-view";
import type { ChangeSet } from "@/lib/changeset/types";
import type { ExecuteChangeSetResult } from "@/lib/changeset/executor";

// ── Types ────────────────────────────────────────────────────────────

interface Message {
  role: "user" | "assistant";
  content: string;
  changeSet?: ChangeSet;
  reasoning?: string;
}

type Phase =
  | "idle"
  | "loading"
  | "draft"
  | "executing"
  | "complete"
  | "error";

// ── Suggested prompts ────────────────────────────────────────────────

const SUGGESTIONS = [
  { label: "Launch spring promo", prompt: "Launch the spring promo for all Stride products" },
  { label: "Discount a product", prompt: "Set a 20% discount on STR-001 Classic Runner" },
  { label: "Activate promo", prompt: "Set promo status to active for STR-002 Court Essential" },
  { label: "Show current prices", prompt: "What are the current prices for all products?" },
];

// ── Component ────────────────────────────────────────────────────────

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [draftChangeSet, setDraftChangeSet] = useState<ChangeSet | null>(null);
  const [draftReasoning, setDraftReasoning] = useState("");
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
    if (!prompt || phase === "loading" || phase === "executing") return;

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
            content:
              "No changes needed \u2014 the current state already matches your request.",
          },
        ]);
        setPhase("complete");
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
        scrollToBottom();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase("error");
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
      scrollToBottom();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase("error");
      scrollToBottom();
    }
  };

  const handleReset = () => {
    setPhase("idle");
    setError("");
    setDraftChangeSet(null);
    setDraftReasoning("");
  };

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

            {msg.changeSet && (
              <div className="ml-0 max-w-full">
                <ChangeSetView changeSet={msg.changeSet} />
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
      <div className="border-t px-6 py-4">
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
            disabled={phase === "loading" || phase === "executing"}
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={
              !input.trim() || phase === "loading" || phase === "executing"
            }
          >
            Send
          </Button>
        </form>
      </div>
    </div>
  );
}
