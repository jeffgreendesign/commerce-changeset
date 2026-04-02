"use client";

import { useDemoAnnotations } from "./demo-annotation-provider";
import { EyeIcon, EyeOffIcon } from "lucide-react";

/**
 * Corner toggle for demo annotations — on/off.
 * Off = production-identical view.
 */
export function DemoAnnotationToggle() {
  const ctx = useDemoAnnotations();
  if (!ctx) return null;

  return (
    <button
      type="button"
      onClick={ctx.toggleEnabled}
      className="fixed right-3 top-3 z-50 flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white/90 px-2.5 py-1 text-[11px] font-medium text-zinc-600 shadow-sm backdrop-blur-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/90 dark:text-zinc-400 dark:hover:bg-zinc-800"
      aria-label={ctx.enabled ? "Hide demo guide" : "Show demo guide"}
    >
      {ctx.enabled ? (
        <>
          <EyeIcon className="size-3" />
          Guide: On
        </>
      ) : (
        <>
          <EyeOffIcon className="size-3" />
          Guide: Off
        </>
      )}
    </button>
  );
}
