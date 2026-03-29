import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Commerce Changeset",
  description:
    "How Commerce Changeset handles your data — plain-language privacy policy for a hackathon demo application.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        Privacy Policy
      </h1>
      <p className="mt-2 text-muted-foreground">Last updated: March 29, 2026</p>

      <div className="mt-10 space-y-8 text-base leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold">What this app is</h2>
          <p className="mt-2 text-muted-foreground">
            Commerce Changeset is a demonstration application built for the
            Auth0 &ldquo;Authorized to Act&rdquo; hackathon. It is not a
            production service. It demonstrates multi-agent orchestration with
            Auth0 Token Vault, CIBA approval flows, and stress-aware
            authorization.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">What data we collect</h2>
          <p className="mt-2 text-muted-foreground">
            When you log in, Auth0 manages your authentication session. The app
            receives your name and email address from your Auth0 profile. If you
            connect a Google account via Auth0 Connected Accounts, Auth0 stores
            your Google refresh token in Token Vault &mdash; this app never sees
            or stores that token directly.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">How data flows</h2>
          <p className="mt-2 text-muted-foreground">
            Agents act on your behalf through Auth0&apos;s On-Behalf-Of
            delegation. At execution time, each agent requests a scoped access
            token from Token Vault to read or write Google Sheets data or send
            Gmail messages. The token exchange is recorded in the execution
            receipt. Your Google credentials are stored by Auth0, not by this
            application.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">What agents can do</h2>
          <ul className="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
            <li>
              <strong>Reader:</strong> Read product data, pricing, and schedules
              from Google Sheets (read-only)
            </li>
            <li>
              <strong>Writer:</strong> Update prices, toggle promotions, modify
              inventory flags, and create products in Google Sheets
            </li>
            <li>
              <strong>Notifier:</strong> Send execution summary and receipt
              emails via Gmail
            </li>
          </ul>
          <p className="mt-2 text-muted-foreground">
            All write operations require your explicit approval via CIBA
            Guardian push notification before execution.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Data retention</h2>
          <p className="mt-2 text-muted-foreground">
            This is a demo application. Your Auth0 session is managed by Auth0
            and expires according to your tenant settings. Chat history is stored
            in your browser&apos;s localStorage and can be cleared at any time.
            No server-side database stores your conversations or changeset
            history.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Analytics and tracking</h2>
          <p className="mt-2 text-muted-foreground">
            This app does not use analytics, tracking pixels, advertising, or
            third-party data collection of any kind.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Disconnecting your account</h2>
          <p className="mt-2 text-muted-foreground">
            You can disconnect your Google account from Auth0 Connected Accounts
            at any time through your Auth0 account settings. This revokes the
            stored refresh token and immediately removes the agents&apos; ability
            to act on your behalf.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Contact</h2>
          <p className="mt-2 text-muted-foreground">
            Questions or concerns? Open an issue on the{" "}
            <a
              href="https://github.com/jeffgreendesign/commerce-changeset"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-foreground"
            >
              GitHub repository
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
