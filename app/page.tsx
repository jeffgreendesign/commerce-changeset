import { auth0 } from "@/lib/auth0";

export default async function Home() {
  const session = await auth0.getSession();

  return (
    <div className="flex flex-col flex-1 items-center justify-center font-sans px-safe">
      <main className="flex w-full max-w-md flex-col items-center gap-8 p-6 sm:p-16">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Commerce Changeset
        </h1>

        {session ? (
          <div className="flex w-full flex-col items-center gap-4">
            <p className="text-base text-zinc-600 sm:text-lg dark:text-zinc-400">
              Logged in as{" "}
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {session.user.email ?? session.user.name}
              </span>
            </p>
            <a
              href="/dashboard"
              className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-zinc-900 px-6 text-base font-medium text-white transition-colors hover:bg-zinc-800 sm:h-10 sm:w-auto sm:rounded-md sm:text-sm dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Go to Dashboard
            </a>
            <a
              href="/auth/logout"
              className="inline-flex min-h-[44px] items-center text-sm text-zinc-500 underline-offset-4 hover:underline dark:text-zinc-400"
            >
              Log out
            </a>
          </div>
        ) : (
          <div className="flex w-full flex-col items-center gap-4">
            <p className="text-base text-zinc-600 sm:text-lg dark:text-zinc-400">
              Sign in to get started.
            </p>
            <a
              href="/auth/login"
              className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-zinc-900 px-6 text-base font-medium text-white transition-colors hover:bg-zinc-800 sm:h-10 sm:w-auto sm:rounded-md sm:text-sm dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Log in
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
