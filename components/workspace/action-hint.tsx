"use client";

import { useEffect, useState } from "react";
import { XIcon } from "lucide-react";

const HINT_KEY = "cc-action-hint-dismissed";
const AUTO_DISMISS_MS = 6000;

interface ActionHintProps {
  onDismiss: () => void;
}

export function ActionHint({ onDismiss }: ActionHintProps) {
  const [visible, setVisible] = useState(false);

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
    const showTimer = setTimeout(() => setVisible(true), 800);
    const hideTimer = setTimeout(() => dismiss(), AUTO_DISMISS_MS + 800);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      sessionStorage.setItem(HINT_KEY, "1");
    } catch {
      // ignore
    }
    onDismiss();
  }

  if (!visible) return null;

  return (
    <div className="pointer-events-auto fixed bottom-24 left-1/2 z-40 -translate-x-1/2 animate-[fade-up_0.3s_ease-out]">
      <div className="flex items-center gap-2 rounded-full bg-foreground/90 px-4 py-2 text-xs text-background shadow-lg backdrop-blur-sm">
        <span className="select-none">Hold any product for quick actions</span>
        <button
          type="button"
          className="flex size-5 items-center justify-center rounded-full hover:bg-background/20 min-h-[44px] min-w-[44px] -mr-2"
          onClick={dismiss}
          aria-label="Dismiss hint"
        >
          <XIcon className="size-3" />
        </button>
      </div>
    </div>
  );
}
