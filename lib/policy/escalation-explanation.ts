const ESCALATION_EXPLANATIONS: Record<string, string> = {
  "stressed-user-write-escalation":
    "Escalated because voice session indicated elevated stress \u2014 you can still approve this operation via push notification.",
  "fatigued-session-write-escalation":
    "Escalated due to extended session duration \u2014 you can still approve this operation via push notification.",
};

export function getEscalationExplanation(ruleName: string): string | null {
  return ESCALATION_EXPLANATIONS[ruleName] ?? null;
}
