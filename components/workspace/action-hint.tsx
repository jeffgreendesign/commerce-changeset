"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { XIcon } from "lucide-react";

const HINT_KEY = "cc-action-hint-dismissed";
const AUTO_DISMISS_MS = 6000;

interface ActionHintProps {
  onDismiss: () => void;
}

export function ActionHint({ onDismiss }: ActionHintProps) {
  const [state, setState] = useState<"hidden" | "entering" | "visible" | "exiting">("hidden");
  const timers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  const track = useCallback((id: ReturnType<typeof setTimeout>) => {
    timers.current.add(id);
    return id;
  }, []);

  const dismiss = useCallback(() => {
    setState((prev) => {
      if (prev === "exiting" || prev === "hidden") return prev;
      // Clear all pending timers (enter, visible, auto-dismiss)
      for (const id of timers.current) clearTimeout(id);
      timers.current.clear();
      try {
        sessionStorage.setItem(HINT_KEY, "1");
      } catch {
        // ignore
      }
      track(setTimeout(() => {
        setState("hidden");
        onDismiss();
      }, 300));
      return "exiting";
    });
  }, [onDismiss, track]);

  useEffect(() => {
    // Skip if already dismissed this session
    if (typeof sessionStorage !== "undefined") {
      try {
        if (sessionStorage.getItem(HINT_KEY)) {
          onDismiss();
          return;
        }
      } catch {
        // sessionStorage may be unavailable
      }
    }
    // Delay appearance so it doesn't flash on fast loads
    track(setTimeout(() => setState("entering"), 800));
    track(setTimeout(() => {
      setState((prev) => (prev === "entering" ? "visible" : prev));
    }, 1100));
    const pending = timers.current;
    return () => {
      for (const id of pending) clearTimeout(id);
      pending.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (state !== "visible") return;
    const pending = timers.current;
    const id = track(setTimeout(() => dismiss(), AUTO_DISMISS_MS));
    return () => {
      clearTimeout(id);
      pending.delete(id);
    };
  }, [state, dismiss, track]);

  if (state === "hidden") return null;

  return (
    <div
      role="status"
      aria-atomic="true"
      className={`pointer-events-auto fixed bottom-24 left-1/2 z-40 -translate-x-1/2 transition-all duration-300 ease-out ${
        state === "exiting"
          ? "translate-y-2 opacity-0"
          : state === "entering"
            ? "translate-y-0 opacity-0"
            : ""
      }`}
      style={state === "entering" ? { animation: "fade-up 0.3s ease-out forwards" } : undefined}
    >
      <div className="animate-cta-shine relative flex items-center gap-3 rounded-full bg-foreground/90 px-5 py-2.5 text-sm text-background shadow-lg ring-1 ring-white/10 backdrop-blur-sm">
        <span className="select-none font-medium tracking-tight">
          Hold any product for quick actions
        </span>
        <button
          type="button"
          className="-mr-1.5 flex size-6 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-background/20"
          onClick={dismiss}
          aria-label="Dismiss hint"
        >
          <XIcon className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
