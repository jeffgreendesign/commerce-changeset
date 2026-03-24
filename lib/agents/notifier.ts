/**
 * Notifier Agent — sends execution summary emails via Gmail API
 * + Token Vault OBO delegation.
 *
 * Like the Writer Agent, this is NOT an LLM agent. It deterministically
 * builds an email from the change set and execution receipt, then sends
 * it via the Gmail API using the authenticated user's Google account.
 */

import { tool } from "ai";
import {
  Auth0AI,
  getAccessTokenFromTokenVault,
} from "@auth0/ai-vercel";
import { z } from "zod/v4";

import type { ChangeSet, ExecutionReceipt } from "@/lib/changeset/types";
import { RiskTier } from "@/lib/policy/types";

// ── Types ────────────────────────────────────────────────────────────

export interface NotifierAgentResult {
  success: boolean;
  messageId?: string;
  error?: string;
  duration: number;
}

// ── Email builder ────────────────────────────────────────────────────

function tierLabel(tier: number): string {
  switch (tier) {
    case RiskTier.READ:
      return "Read (Tier 0)";
    case RiskTier.NOTIFY:
      return "Notify (Tier 1)";
    case RiskTier.WRITE:
      return "Write (Tier 2)";
    case RiskTier.BULK:
      return "Bulk (Tier 3)";
    default:
      return `Tier ${tier}`;
  }
}

function buildNotificationEmail(
  changeSet: ChangeSet,
  receipt: ExecutionReceipt,
  recipientEmail: string
): { to: string; subject: string; htmlBody: string } {
  const idPrefix = changeSet.id.slice(0, 8);
  const subject = `[Commerce ChangeSet] Execution Complete: ${idPrefix}`;

  const opRows = changeSet.operations
    .map((op) => {
      const result = changeSet.execution?.results.find(
        (r) => r.operationId === op.id
      );
      const status = result?.status ?? "unknown";
      const statusIcon = status === "success" ? "&#9989;" : "&#10060;";
      const diffs = op.diff
        .map((d) => `${d.field}: ${String(d.before)} &rarr; ${String(d.after)}`)
        .join(", ");
      return `<tr>
        <td style="padding:6px 12px;border:1px solid #e5e7eb">${statusIcon} ${status}</td>
        <td style="padding:6px 12px;border:1px solid #e5e7eb">${op.action}</td>
        <td style="padding:6px 12px;border:1px solid #e5e7eb">${op.target}</td>
        <td style="padding:6px 12px;border:1px solid #e5e7eb">${tierLabel(op.tier)}</td>
        <td style="padding:6px 12px;border:1px solid #e5e7eb">${diffs}</td>
      </tr>`;
    })
    .join("\n");

  const checksTotal = receipt.verification.checksRun;
  const checksPassed = receipt.verification.checksPassed;
  const verifyColor = checksPassed === checksTotal ? "#16a34a" : "#dc2626";

  const delegations = receipt.agentDelegations
    .map(
      (d) =>
        `<li><strong>${d.agent}</strong> (on behalf of ${d.actingOnBehalfOf}): ${d.toolsGranted.join(", ")} &mdash; ${d.operationsPerformed.join(", ")}</li>`
    )
    .join("\n");

  const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#1f2937">
  <h2 style="margin:0 0 8px">Commerce ChangeSet Execution Complete</h2>
  <p style="color:#6b7280;margin:0 0 24px">Change set <code>${changeSet.id}</code></p>

  <h3 style="margin:0 0 8px">Original Request</h3>
  <p style="background:#f9fafb;padding:12px;border-radius:6px;margin:0 0 24px">${changeSet.originalPrompt}</p>

  <h3 style="margin:0 0 8px">Operations</h3>
  <table style="width:100%;border-collapse:collapse;margin:0 0 24px;font-size:14px">
    <thead>
      <tr style="background:#f3f4f6">
        <th style="padding:6px 12px;border:1px solid #e5e7eb;text-align:left">Status</th>
        <th style="padding:6px 12px;border:1px solid #e5e7eb;text-align:left">Action</th>
        <th style="padding:6px 12px;border:1px solid #e5e7eb;text-align:left">Target</th>
        <th style="padding:6px 12px;border:1px solid #e5e7eb;text-align:left">Risk Tier</th>
        <th style="padding:6px 12px;border:1px solid #e5e7eb;text-align:left">Changes</th>
      </tr>
    </thead>
    <tbody>
      ${opRows}
    </tbody>
  </table>

  <h3 style="margin:0 0 8px">Verification</h3>
  <p style="margin:0 0 24px">
    <span style="color:${verifyColor};font-weight:600">${checksPassed}/${checksTotal} checks passed</span>
  </p>

  <h3 style="margin:0 0 8px">OBO Delegation Chain</h3>
  <p style="margin:0 0 4px">${receipt.oboChain.user} &rarr; ${receipt.oboChain.delegatedTo.join(" &rarr; ")}</p>
  <ul style="margin:0 0 24px">${delegations}</ul>

  <h3 style="margin:0 0 8px">Rollback Instructions</h3>
  <p style="background:#fef2f2;padding:12px;border-radius:6px;margin:0 0 24px;font-size:13px">${receipt.rollbackInstructions}</p>

  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
  <p style="color:#9ca3af;font-size:12px;margin:0">
    Receipt ID: <code>${receipt.changeSetId}</code> &bull;
    Audit hash: <code>${receipt.auditHash.slice(0, 20)}...</code> &bull;
    Executed at: ${receipt.executedAt}
  </p>
</body>
</html>`.trim();

  return { to: recipientEmail, subject, htmlBody };
}

// ── Receipt email builder ────────────────────────────────────────────

function buildReceiptEmail(
  receipt: ExecutionReceipt,
  recipientEmail: string
): { to: string; subject: string; htmlBody: string } {
  const idPrefix = receipt.changeSetId.slice(0, 8);
  const subject = `[Commerce ChangeSet] Execution Receipt: ${idPrefix}`;

  const allPassed = receipt.verification.checksPassed === receipt.verification.checksRun;
  const verifyColor = allPassed ? "#16a34a" : "#dc2626";

  const checkRows = receipt.verification.results
    .map((c) => {
      const icon = c.status === "pass" ? "&#9989;" : c.status === "fail" ? "&#10060;" : "&#9888;";
      return `<tr>
        <td style="padding:4px 8px;border:1px solid #e5e7eb">${icon} ${c.status}</td>
        <td style="padding:4px 8px;border:1px solid #e5e7eb">${c.field}</td>
        <td style="padding:4px 8px;border:1px solid #e5e7eb">${String(c.expected)}</td>
        <td style="padding:4px 8px;border:1px solid #e5e7eb">${String(c.actual)}</td>
      </tr>`;
    })
    .join("\n");

  const delegationRows = receipt.agentDelegations
    .map(
      (d) => `<tr>
        <td style="padding:4px 8px;border:1px solid #e5e7eb"><strong>${d.agent}</strong></td>
        <td style="padding:4px 8px;border:1px solid #e5e7eb">${d.actingOnBehalfOf}</td>
        <td style="padding:4px 8px;border:1px solid #e5e7eb">${d.toolsGranted.join(", ")}</td>
        <td style="padding:4px 8px;border:1px solid #e5e7eb">${d.contextReceived}</td>
        <td style="padding:4px 8px;border:1px solid #e5e7eb"><code>${d.tokenExchangeId}</code></td>
        <td style="padding:4px 8px;border:1px solid #e5e7eb">${d.operationsPerformed.join(", ")}</td>
        <td style="padding:4px 8px;border:1px solid #e5e7eb">${d.duration.toFixed(0)}ms</td>
      </tr>`
    )
    .join("\n");

  const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:720px;margin:0 auto;padding:24px;color:#1f2937">
  <h2 style="margin:0 0 8px">Execution Receipt</h2>
  <p style="color:#6b7280;margin:0 0 24px">Change set <code>${receipt.changeSetId}</code></p>

  <h3 style="margin:0 0 8px">OBO Delegation Chain</h3>
  <p style="background:#f9fafb;padding:12px;border-radius:6px;margin:0 0 24px">
    ${receipt.oboChain.user} &rarr; ${receipt.oboChain.delegatedTo.join(" &rarr; ")}
  </p>

  <h3 style="margin:0 0 8px">Agent Delegations</h3>
  <table style="width:100%;border-collapse:collapse;margin:0 0 24px;font-size:13px">
    <thead>
      <tr style="background:#f3f4f6">
        <th style="padding:4px 8px;border:1px solid #e5e7eb;text-align:left">Agent</th>
        <th style="padding:4px 8px;border:1px solid #e5e7eb;text-align:left">On behalf of</th>
        <th style="padding:4px 8px;border:1px solid #e5e7eb;text-align:left">Tools</th>
        <th style="padding:4px 8px;border:1px solid #e5e7eb;text-align:left">Context</th>
        <th style="padding:4px 8px;border:1px solid #e5e7eb;text-align:left">Token Exchange</th>
        <th style="padding:4px 8px;border:1px solid #e5e7eb;text-align:left">Operations</th>
        <th style="padding:4px 8px;border:1px solid #e5e7eb;text-align:left">Duration</th>
      </tr>
    </thead>
    <tbody>${delegationRows}</tbody>
  </table>

  <h3 style="margin:0 0 8px">Verification</h3>
  <p style="margin:0 0 8px">
    <span style="color:${verifyColor};font-weight:600">${receipt.verification.checksPassed}/${receipt.verification.checksRun} checks passed</span>
  </p>
  <table style="width:100%;border-collapse:collapse;margin:0 0 24px;font-size:13px">
    <thead>
      <tr style="background:#f3f4f6">
        <th style="padding:4px 8px;border:1px solid #e5e7eb;text-align:left">Status</th>
        <th style="padding:4px 8px;border:1px solid #e5e7eb;text-align:left">Field</th>
        <th style="padding:4px 8px;border:1px solid #e5e7eb;text-align:left">Expected</th>
        <th style="padding:4px 8px;border:1px solid #e5e7eb;text-align:left">Actual</th>
      </tr>
    </thead>
    <tbody>${checkRows}</tbody>
  </table>

  <h3 style="margin:0 0 8px">Rollback Instructions</h3>
  <p style="background:#fef2f2;padding:12px;border-radius:6px;margin:0 0 24px;font-size:13px">${receipt.rollbackInstructions}</p>

  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
  <p style="color:#9ca3af;font-size:12px;margin:0">
    Executed by: <strong>${receipt.executedBy}</strong> &bull;
    Executed at: ${receipt.executedAt}
  </p>
  <p style="color:#9ca3af;font-size:11px;font-family:monospace;margin:4px 0 0;word-break:break-all">
    Audit hash: ${receipt.auditHash}
  </p>
</body>
</html>`.trim();

  return { to: recipientEmail, subject, htmlBody };
}

// ── Gmail API helper ─────────────────────────────────────────────────

async function sendEmail(
  to: string,
  subject: string,
  htmlBody: string
): Promise<string> {
  const accessToken = getAccessTokenFromTokenVault();

  const message = [
    `To: ${to}`,
    `Subject: ${subject}`,
    `Content-Type: text/html; charset=utf-8`,
    `MIME-Version: 1.0`,
    "",
    htmlBody,
  ].join("\r\n");

  const raw = Buffer.from(message).toString("base64url");

  const res = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw }),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gmail API ${res.status}: ${body}`);
  }

  const data: { id: string } = await res.json();
  return data.id;
}

// ── Agent runner ─────────────────────────────────────────────────────
// Auth0AI is lazy-init (same pattern as reader.ts / writer.ts).
// A single tool is created and manually invoked so that the Token Vault
// async context is established for getAccessTokenFromTokenVault().

let auth0AI: Auth0AI;

export async function runNotifierAgent(
  changeSet: ChangeSet,
  receipt: ExecutionReceipt,
  recipientEmail: string,
  refreshToken: string
): Promise<NotifierAgentResult> {
  if (!auth0AI) {
    auth0AI = new Auth0AI();
  }

  const withGmailToken = auth0AI.withTokenVault({
    connection: "google-oauth2",
    scopes: ["https://www.googleapis.com/auth/gmail.send"],
    refreshToken: async () => refreshToken,
  });

  const notifierTool = withGmailToken(
    tool({
      description: "Send execution summary email via Gmail",
      inputSchema: z.object({}),
      execute: async () => {
        const { to, subject, htmlBody } = buildNotificationEmail(
          changeSet,
          receipt,
          recipientEmail
        );
        const messageId = await sendEmail(to, subject, htmlBody);
        return { messageId };
      },
    })
  );

  console.log(`[notifier] Sending to ${recipientEmail}`);
  const start = performance.now();

  try {
    const execute = notifierTool.execute as (
      input: Record<string, never>,
      ctx: { toolCallId: string; messages: unknown[] }
    ) => Promise<{ messageId: string }>;

    const { messageId } = await execute(
      {} as Record<string, never>,
      { toolCallId: `notifier-${crypto.randomUUID()}`, messages: [] }
    );

    console.log(`[notifier] ✓ Sent messageId: ${messageId} in ${Math.round(performance.now() - start)}ms`);
    return {
      success: true,
      messageId,
      duration: performance.now() - start,
    };
  } catch (err) {
    console.error("[notifier] Failed to send notification:", err instanceof Error ? err.message : err);
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
      duration: performance.now() - start,
    };
  }
}

// ── Execution receipt email ─────────────────────────────────────────

export async function sendExecutionReceipt(
  receipt: ExecutionReceipt,
  recipientEmail: string,
  refreshToken: string
): Promise<NotifierAgentResult> {
  if (!auth0AI) {
    auth0AI = new Auth0AI();
  }

  const withGmailToken = auth0AI.withTokenVault({
    connection: "google-oauth2",
    scopes: ["https://www.googleapis.com/auth/gmail.send"],
    refreshToken: async () => refreshToken,
  });

  const receiptTool = withGmailToken(
    tool({
      description: "Send execution receipt email via Gmail",
      inputSchema: z.object({}),
      execute: async () => {
        const { to, subject, htmlBody } = buildReceiptEmail(
          receipt,
          recipientEmail
        );
        const messageId = await sendEmail(to, subject, htmlBody);
        return { messageId };
      },
    })
  );

  console.log(`[notifier] Sending receipt to ${recipientEmail}`);
  const start = performance.now();

  try {
    const execute = receiptTool.execute as (
      input: Record<string, never>,
      ctx: { toolCallId: string; messages: unknown[] }
    ) => Promise<{ messageId: string }>;

    const { messageId } = await execute(
      {} as Record<string, never>,
      { toolCallId: `notifier-receipt-${crypto.randomUUID()}`, messages: [] }
    );

    console.log(`[notifier] ✓ Receipt sent messageId: ${messageId} in ${Math.round(performance.now() - start)}ms`);
    return {
      success: true,
      messageId,
      duration: performance.now() - start,
    };
  } catch (err) {
    console.error("[notifier] Failed to send receipt:", err instanceof Error ? err.message : err);
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
      duration: performance.now() - start,
    };
  }
}
