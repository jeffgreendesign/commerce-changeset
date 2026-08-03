/**
 * Central model configuration for every Anthropic call site.
 *
 * Model IDs live here, not inline at the call sites, so a model bump is a
 * one-file change. Each is env-overridable for staging/rollback without a
 * redeploy of new code.
 *
 * Keep the user-visible model names in sync when these change:
 *   - components/demo/demo-insight-bar.tsx
 *   - components/demo/demo-annotation-provider.tsx
 *   - README.md, llms.txt
 */

/** Reader Agent — read-only Sheets tool loop (generateText). */
export const READER_MODEL = process.env.READER_MODEL ?? "claude-sonnet-5";

/** Orchestrator Agent — request decomposition into operations (generateObject). */
export const ORCHESTRATOR_MODEL =
  process.env.ORCHESTRATOR_MODEL ?? "claude-sonnet-5";

/** Demo scenario classifier — cheap fuzzy intent match (generateObject). */
export const CLASSIFIER_MODEL =
  process.env.CLASSIFIER_MODEL ?? "claude-haiku-4-5";

/**
 * Human-readable name for the model that drives the agents, for UI copy.
 *
 * Deliberately not env-overridable: this constant is imported by client
 * components, where a non-`NEXT_PUBLIC_` `process.env` read is inlined as
 * `undefined` and would silently fall through to the default anyway.
 * Update it alongside ORCHESTRATOR_MODEL.
 */
export const ORCHESTRATOR_MODEL_LABEL = "Claude Sonnet 5";

/**
 * Output ceiling for the orchestrator's decomposition step.
 *
 * Sonnet 5 runs adaptive thinking by default, and the cap covers thinking plus
 * the response together — an unset ceiling risks truncating the operations
 * array mid-object. The decomposition prompt also carries the full reader
 * summary plus raw tool results, so leave real headroom here.
 */
export const ORCHESTRATOR_MAX_OUTPUT_TOKENS = 16_000;
