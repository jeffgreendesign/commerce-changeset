import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Commerce Changeset — Interactive Demo",
  description: "Experience the full Auth0-powered commerce change workflow without credentials.",
};

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
