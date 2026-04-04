"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Judge access gate — validates a shared access code, then redirects
 * to the judge dashboard (production UI with simulated data).
 */
export default function JudgesLoginPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/judges/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      if (!res.ok) {
        let message = `Error ${res.status}: ${res.statusText}`;
        try {
          const data = (await res.json()) as { error?: string };
          if (data.error) message = data.error;
        } catch {
          // Response wasn't JSON — fall through with status-based message
        }
        setError(message);
        setLoading(false);
        return;
      }

      // Cookie is set server-side via Set-Cookie header (HttpOnly + Secure)
      router.push("/judges/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
        {/* Branding */}
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-xl bg-zinc-900 dark:bg-zinc-100">
            <span className="text-lg font-bold text-white dark:text-zinc-900">
              SA
            </span>
          </div>
          <h1 className="text-lg font-semibold tracking-tight">
            Stride Athletics
          </h1>
          <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
            Judge Access &mdash; Commerce Changeset
          </p>
        </div>

        {/* Access code form */}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="access-code"
              className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300"
            >
              Access Code
            </label>
            <input
              id="access-code"
              type="password"
              autoComplete="off"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter judge access code"
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-base text-zinc-900 md:text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

          {error && (
            <p className="mb-3 text-center text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !code}
            className="flex h-10 w-full items-center justify-center rounded-lg bg-zinc-900 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {loading ? "Verifying..." : "Enter as Judge"}
          </button>
        </form>

        {/* Divider */}
        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-700" />
          <span className="text-xs text-zinc-400">or</span>
          <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-700" />
        </div>

        {/* Auth0 production login link */}
        <a
          href="/auth/login"
          className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 text-sm text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          Log in with Auth0 for full production access
        </a>
      </div>
    </div>
  );
}
