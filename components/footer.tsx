import Link from "next/link";

const navLinks = [
  { href: "/blog", label: "Blog" },
  { href: "/about", label: "About" },
  { href: "/changelog", label: "Changelog" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

export function Footer() {
  return (
    <footer className="border-t border-border px-safe">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 px-6 py-8 text-sm text-muted-foreground sm:flex-row sm:justify-between">
        <div className="flex items-center gap-2">
          <span>Commerce Changeset</span>
          <span aria-hidden="true" className="hidden sm:inline">
            &middot;
          </span>
          <span className="hidden sm:inline">Auth0 Hackathon 2026</span>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="underline-offset-4 hover:text-foreground hover:underline"
            >
              {link.label}
            </Link>
          ))}
          <a
            href="https://github.com/jeffgreendesign/commerce-changeset"
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-4 hover:text-foreground hover:underline"
          >
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}
