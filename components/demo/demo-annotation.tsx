"use client";

import type { AnnotationDef } from "./demo-annotation-provider";

// ── Category styling ────────────────────────────────────────────────

const CATEGORY_STYLES: Record<
  string,
  { bg: string; text: string; tag: string; border: string }
> = {
  auth0: {
    bg: "bg-indigo-50 dark:bg-indigo-950/40",
    text: "text-indigo-700 dark:text-indigo-300",
    tag: "text-indigo-500 dark:text-indigo-400",
    border: "border-indigo-200 dark:border-indigo-800",
  },
  policy: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-300",
    tag: "text-amber-500 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-800",
  },
  agent: {
    bg: "bg-blue-50 dark:bg-blue-950/40",
    text: "text-blue-700 dark:text-blue-300",
    tag: "text-blue-500 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-800",
  },
  security: {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
    tag: "text-emerald-500 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-800",
  },
  audit: {
    bg: "bg-zinc-100 dark:bg-zinc-800/60",
    text: "text-zinc-700 dark:text-zinc-300",
    tag: "text-zinc-500 dark:text-zinc-400",
    border: "border-zinc-200 dark:border-zinc-700",
  },
};

const CATEGORY_LABELS: Record<string, string> = {
  auth0: "Auth0",
  policy: "Policy Engine",
  agent: "AI Agent",
  security: "Security",
  audit: "Audit Trail",
};

// ── Component ───────────────────────────────────────────────────────

export function DemoAnnotation({ annotation }: { annotation: AnnotationDef }) {
  const styles = CATEGORY_STYLES[annotation.category] ?? CATEGORY_STYLES.audit;
  const label = CATEGORY_LABELS[annotation.category] ?? annotation.category;

  return (
    <div
      className={`animate-step-enter rounded-xl border px-3 py-2.5 ${styles.bg} ${styles.border}`}
    >
      <p className={`mb-0.5 text-[10px] font-semibold uppercase tracking-wider ${styles.tag}`}>
        {label}
      </p>
      <p className={`text-xs leading-relaxed ${styles.text}`}>
        {annotation.text}
      </p>
      {annotation.tags && annotation.tags.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {annotation.tags.map((tag) => (
            <span
              key={tag}
              className={`rounded-md px-1.5 py-0.5 text-[10px] ${styles.tag} bg-black/5 dark:bg-white/5`}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
