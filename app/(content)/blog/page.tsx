import type { Metadata } from "next";
import Link from "next/link";

interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  readingTime: string;
}

const posts: BlogPost[] = [
  {
    slug: "building-trust-surfaces-for-ai-agents",
    title:
      "Building Trust Surfaces for AI Agents: What Token Vault Taught Us About Authorization at the Speed of Autonomy",
    description:
      "How we wired multi-agent orchestration through a real identity layer — and what broke along the way.",
    date: "2026-03-29",
    readingTime: "5 min read",
  },
];

export const metadata: Metadata = {
  title: "Blog | Commerce Changeset",
  description:
    "Engineering notes on building agent-mediated commerce with Auth0 Token Vault, CIBA, and stress-aware authorization.",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function BlogIndex() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Blog</h1>
      <p className="mt-2 text-lg text-muted-foreground">
        Engineering notes from the Commerce Changeset project.
      </p>

      <div className="mt-12 space-y-10">
        {posts.map((post) => (
          <article key={post.slug}>
            <Link
              href={`/blog/${post.slug}`}
              className="group block space-y-3"
            >
              <h2 className="text-xl font-medium leading-snug tracking-tight group-hover:underline sm:text-2xl">
                {post.title}
              </h2>
              <p className="text-base leading-relaxed text-muted-foreground">
                {post.description}
              </p>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <time dateTime={post.date}>{formatDate(post.date)}</time>
                <span aria-hidden="true">&middot;</span>
                <span>{post.readingTime}</span>
              </div>
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
