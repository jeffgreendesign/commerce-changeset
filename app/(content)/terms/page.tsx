import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Commerce Changeset",
  description:
    "Terms of service for Commerce Changeset — a hackathon demonstration application.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        Terms of Service
      </h1>
      <p className="mt-2 text-muted-foreground">Last updated: March 29, 2026</p>

      <div className="mt-10 space-y-8 text-base leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold">Demonstration application</h2>
          <p className="mt-2 text-muted-foreground">
            Commerce Changeset is a demonstration application built for the{" "}
            <a href="https://authorizedtoact.devpost.com/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-foreground">Authorized to Act: Auth0 for AI Agents</a> hackathon. It is not a
            production service. It is provided as-is for educational and
            evaluation purposes.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">No warranty</h2>
          <p className="mt-2 text-muted-foreground">
            This application is provided without warranty of any kind, express
            or implied. There is no service level agreement, no uptime
            guarantee, and no commitment to ongoing maintenance or support.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Google account connection</h2>
          <p className="mt-2 text-muted-foreground">
            When you connect your Google account via Auth0 Connected Accounts,
            you authorize the application&apos;s agents to read and write Google
            Sheets data and send Gmail messages on your behalf. You can
            disconnect your Google account at any time through your Auth0
            account settings, which immediately revokes agent access.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Token Vault delegation</h2>
          <p className="mt-2 text-muted-foreground">
            This application operates on your behalf via Auth0 Token Vault. Your
            Google credentials are stored by Auth0, not by this application.
            Agents receive scoped, time-limited access tokens through
            Auth0&apos;s On-Behalf-Of delegation flow. All write operations
            require your explicit approval via CIBA Guardian push notification.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Your responsibility</h2>
          <p className="mt-2 text-muted-foreground">
            You are responsible for reviewing changeset operations before
            approving them. The application displays diffs, risk assessments, and
            rollback instructions to help you make informed decisions. Approved
            operations modify real data in your connected Google Sheets.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">License</h2>
          <p className="mt-2 text-muted-foreground">
            Commerce Changeset is open source under the{" "}
            <a
              href="https://github.com/jeffgreendesign/commerce-changeset/blob/main/LICENSE"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-foreground"
            >
              MIT License
            </a>
            . The source code is available on{" "}
            <a
              href="https://github.com/jeffgreendesign/commerce-changeset"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-foreground"
            >
              GitHub
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
