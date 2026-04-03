/**
 * Pipeline phase — the UI state machine for the chat/agent workflow.
 *
 * Shared across the chat view, voice controls, demo annotations,
 * and Token Vault activity components.
 */
export type PipelinePhase =
  | "idle"
  | "loading"
  | "draft"
  | "executing"
  | "rolling_back"
  | "complete"
  | "error";
