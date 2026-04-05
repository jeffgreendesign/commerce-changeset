import Link from "next/link";
import { Footer } from "@/components/footer";

const navLinks = [
  { href: "/blog", label: "Blog" },
  { href: "/about", label: "About" },
  { href: "/changelog", label: "Changelog" },
];

export default function ContentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dark flex h-dvh flex-col overflow-y-auto bg-[oklch(0.15_0_0)] text-foreground [--border:oklch(1_0_0/12%)] [--foreground:oklch(0.95_0_0)] [--muted-foreground:oklch(0.65_0_0)]">
      <header className="sticky top-0 z-30 border-b border-border bg-[oklch(0.15_0_0/80%)] pt-safe [-webkit-backdrop-filter:blur(12px)_saturate(1.4)] [backdrop-filter:blur(12px)_saturate(1.4)]">
        <div
          className="header-gradient-line absolute inset-x-0 top-0 h-px"
          aria-hidden="true"
        />
        <nav className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
          <Link
            href="/"
            className="text-sm font-semibold tracking-tight text-foreground transition-colors hover:text-accent-teal"
          >
            Commerce Changeset
          </Link>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="underline-offset-4 transition-colors hover:text-foreground hover:underline"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
