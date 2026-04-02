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
    <div className="flex h-dvh flex-col overflow-y-auto">
      <header className="glass sticky top-0 z-30 border-b border-border/50 pt-safe">
        <div
          className="absolute inset-x-0 top-0 h-px"
          style={{
            backgroundImage:
              "linear-gradient(90deg, oklch(0.6 0.2 264), oklch(0.72 0.2 185), oklch(0.7 0.18 85), oklch(0.7 0.18 155))",
          }}
          aria-hidden="true"
        />
        <nav className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
          <Link
            href="/"
            className="text-sm font-semibold tracking-tight transition-colors hover:text-accent-teal"
          >
            Commerce Changeset
          </Link>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="underline-offset-4 hover:text-foreground hover:underline"
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
