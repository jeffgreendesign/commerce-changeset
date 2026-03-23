import { auth0 } from "@/lib/auth0";

export default async function Home() {
  const session = await auth0.getSession();

  return (
    <div className="flex flex-col flex-1 items-center justify-center font-sans">
      <main className="flex flex-col items-center gap-8 p-16">
        <h1 className="text-3xl font-semibold tracking-tight">
          Commerce Changeset
        </h1>

        {session ? (
          <div className="flex flex-col items-center gap-4">
            <p className="text-lg text-zinc-600 dark:text-zinc-400">
              Logged in as{" "}
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {session.user.email ?? session.user.name}
              </span>
            </p>
            <a
              href="/auth/logout"
              className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Log out
            </a>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <p className="text-lg text-zinc-600 dark:text-zinc-400">
              Sign in to get started.
            </p>
            <a
              href="/auth/login"
              className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Log in
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
