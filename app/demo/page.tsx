"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DEMO_COOKIE_NAME } from "@/lib/demo/config";

/**
 * Mock Auth0 Universal Login — styled to resemble the real flow.
 * Sets a demo session cookie and redirects to /demo/dashboard.
 */
export default function DemoLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  function handleLogin() {
    setLoading(true);
    // Set demo session cookie (client-side, 1 hour expiry)
    document.cookie = `${DEMO_COOKIE_NAME}=true; path=/; max-age=3600; SameSite=Lax`;
    router.push("/demo/dashboard");
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      {/* Mock Auth0 card */}
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
        {/* Auth0 branding area */}
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
            Sign in to Commerce Changeset
          </p>
        </div>

        {/* Email field (pre-filled, read-only) */}
        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Email
          </label>
          <input
            type="email"
            value="demo@stride-athletics.com"
            readOnly
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-base text-zinc-900 md:text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>

        {/* Continue button */}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="flex h-10 w-full items-center justify-center rounded-lg bg-zinc-900 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {loading ? "Signing in..." : "Continue as Demo User"}
        </button>

        {/* Divider */}
        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-700" />
          <span className="text-xs text-zinc-400">or</span>
          <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-700" />
        </div>

        {/* Social login buttons (decorative) */}
        <button
          disabled
          className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400"
        >
          <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </button>
      </div>

      {/* Demo annotation */}
      <div className="mt-6 max-w-sm rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 dark:border-indigo-900 dark:bg-indigo-950/50">
        <p className="text-center text-xs leading-relaxed text-indigo-700 dark:text-indigo-300">
          <span className="font-semibold">Demo mode</span> — In production, this
          is Auth0 Universal Login with MFA, Connected Accounts, and Google OAuth
          consent for Token Vault delegation.
        </p>
      </div>
    </div>
  );
}
