"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { PipelinePhase as Phase } from "@/lib/pipeline-phase";

// ── Types ───────────────────────────────────────────────────────────

type AnnotationCategory = "auth0" | "policy" | "agent" | "security" | "audit";

export interface AnnotationDef {
  id: string;
  phase: Phase | Phase[];
  category: AnnotationCategory;
  text: string;
  tags?: string[];
}

interface DemoAnnotationContextValue {
  enabled: boolean;
  toggleEnabled: () => void;
  phase: Phase;
  setPhase: (p: Phase) => void;
  annotations: AnnotationDef[];
  activeAnnotations: AnnotationDef[];
}

// ── Annotation definitions ──────────────────────────────────────────

const ANNOTATIONS: AnnotationDef[] = [
  {
    id: "loading-token-vault",
    phase: "loading",
    category: "auth0",
    text: "Reader agent exchanges a Token Vault refresh token for Google Sheets access via OBO delegation.",
    tags: ["Token Vault", "OBO", "Scoped Access"],
  },
  {
    id: "loading-orchestrator",
    phase: "loading",
    category: "agent",
    text: "Claude Sonnet 4.6 decomposes your request into discrete operations with structured output.",
    tags: ["Claude Sonnet 4.6", "Vercel AI SDK"],
  },
  {
    id: "draft-policy",
    phase: "draft",
    category: "policy",
    text: "json-rules-engine evaluates 7 policy rules per operation. Stress and session fatigue can escalate the tier.",
    tags: ["json-rules-engine", "Risk Tiers 0–3"],
  },
  {
    id: "draft-ciba",
    phase: "draft",
    category: "auth0",
    text: "Tier 2+ operations require CIBA approval — a Guardian push notification to your phone.",
    tags: ["CIBA", "Guardian", "Step-up Auth"],
  },
  {
    id: "executing-guardian",
    phase: "executing",
    category: "auth0",
    text: "In production, this is a real Guardian push notification on your enrolled device.",
    tags: ["CIBA", "Guardian", "MFA"],
  },
  {
    id: "executing-writer",
    phase: "executing",
    category: "auth0",
    text: "Writer agent uses Token Vault OBO to update Google Sheets. Scoped to approved operations only.",
    tags: ["Token Vault", "OBO", "Google Sheets API"],
  },
  {
    id: "complete-receipt",
    phase: "complete",
    category: "audit",
    text: "Receipt includes per-agent delegation records, token exchange IDs, and a SHA-256 audit hash.",
    tags: ["Audit Trail", "SHA-256", "OBO Chain"],
  },
  {
    id: "complete-rollback",
    phase: "complete",
    category: "security",
    text: "Every changeset is reversible. Rollbacks run through the same policy engine and can escalate tier.",
    tags: ["Rollback Parity", "Policy Re-evaluation"],
  },
];

// ── Context ─────────────────────────────────────────────────────────

const DemoAnnotationContext = createContext<DemoAnnotationContextValue | null>(null);

export function useDemoAnnotations(): DemoAnnotationContextValue | null {
  return useContext(DemoAnnotationContext);
}

// ── Provider ────────────────────────────────────────────────────────

const STORAGE_KEY = "demo-annotations-enabled";

function getInitialEnabled(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(STORAGE_KEY) !== "false";
}

export function DemoAnnotationProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(getInitialEnabled);
  const [phase, setPhase] = useState<Phase>("idle");

  const toggleEnabled = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  const activeAnnotations = enabled
    ? ANNOTATIONS.filter((a) => {
        const phases = Array.isArray(a.phase) ? a.phase : [a.phase];
        return phases.includes(phase);
      })
    : [];

  return (
    <DemoAnnotationContext.Provider
      value={{
        enabled,
        toggleEnabled,
        phase,
        setPhase,
        annotations: ANNOTATIONS,
        activeAnnotations,
      }}
    >
      {children}
    </DemoAnnotationContext.Provider>
  );
}
