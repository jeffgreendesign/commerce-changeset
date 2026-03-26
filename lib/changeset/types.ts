/**
 * Change Set types — the core data model for commerce change workflows.
 *
 * A ChangeSet tracks a group of operations from decomposition through
 * approval and execution, with diffs, policy decisions, and rollback
 * instructions for each operation.
 */

import type { RiskTier, PolicyDecision } from "@/lib/policy/types";
import type {
  VoiceUserContext,
  RepetitionSignal,
  ProactiveIssue,
} from "@/lib/voice/types";

// ── Operation primitives ────────────────────────────────────────────

/** A single field-level diff within an operation. */
export interface OperationDiff {
  field: string;
  before: string | number | boolean;
  after: string | number | boolean;
}

/** Instructions for reversing a single operation. */
export interface RollbackInstruction {
  action: string;
  params: Record<string, unknown>;
}

/** A discrete operation within a change set. */
export interface Operation {
  id: string;
  agent: "reader" | "writer" | "notifier";
  action: string;
  target: string;
  tier: RiskTier;
  policyExplanation: PolicyDecision;
  diff: OperationDiff[];
  rollback: RollbackInstruction;
}

// ── Risk summary ────────────────────────────────────────────────────

export interface RiskSummary {
  maxTier: RiskTier;
  operationsByTier: Record<number, number>;
  requiresCIBA: boolean;
  autonomousOps: number;
  approvalRequiredOps: number;
}

// ── Change Set lifecycle ────────────────────────────────────────────

export type ChangeSetStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "executing"
  | "completed"
  | "partial_failure"
  | "expired"
  | "rolled_back";

// ── Approval types (populated after CIBA + RAR approval) ────────────

export interface AuthorizationDetail {
  type: "commerce_changeset";
  operations: {
    action: string;
    target: string;
    diff: OperationDiff[];
    tier: RiskTier;
  }[];
}

export interface ChangeSetApproval {
  approvedBy: string;
  approvedAt: string;
  cibaTransactionId: string;
  scopesGranted: string[];
  authorizationDetails: AuthorizationDetail[];
}

// ── Execution types (populated after Writer Agent executes) ─────────

export interface OperationResult {
  operationId: string;
  status: "success" | "failure" | "skipped";
  error?: string;
  duration: number;
}

export interface VerificationCheck {
  operationId: string;
  field: string;
  expected: string | number | boolean;
  actual: string | number | boolean;
  status: "pass" | "warning" | "fail";
}

export interface AgentDelegation {
  agent: string;
  actingOnBehalfOf: string;
  toolsGranted: string[];
  contextReceived: string;
  tokenExchangeId: string;
  operationsPerformed: string[];
  duration: number;
}

export interface ExecutionReceipt {
  changeSetId: string;
  executedBy: string;
  executedAt: string;
  oboChain: {
    user: string;
    delegatedTo: string[];
  };
  agentDelegations: AgentDelegation[];
  verification: {
    checksRun: number;
    checksPassed: number;
    results: VerificationCheck[];
  };
  rollbackInstructions: string;
  auditHash: string;
}

export interface ChangeSetExecution {
  executedAt: string;
  results: OperationResult[];
  receipt: ExecutionReceipt;
}

// ── Top-level ChangeSet ─────────────────────────────────────────────

export interface ChangeSet {
  id: string;
  requestedBy: string;
  originalPrompt: string;
  createdAt: string;
  status: ChangeSetStatus;
  operations: Operation[];
  riskSummary: RiskSummary;
  approval?: ChangeSetApproval;
  execution?: ChangeSetExecution;
  /** When set, this changeset is a reversal of the referenced original. */
  rollbackOf?: string;
  // ── Voice/contextual intelligence (populated by Gemini Live) ────────
  /** Voice-derived user context at the time of changeset creation. */
  voiceContext?: VoiceUserContext;
  /** Repetition signal if the orchestrator detected a repetitive workflow. */
  repetitionSignal?: RepetitionSignal;
  /** Proactive issues detected by analyzing operations against business rules. */
  proactiveIssues?: ProactiveIssue[];
}
