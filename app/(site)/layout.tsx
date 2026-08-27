import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: {
    template: "%s | serahbobin",
    default: "serahbobin — drawing portfolio",
  },
  description:
    "Sketchbook pages, still life, colour studies and illustration by serahbobin, applying to NID, NIFT and UCEED.",
};

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-[var(--color-ink)]/10 bg-[var(--color-paper)]/80 px-6 py-3 backdrop-blur-md">
        <Link
          href="/"
          className="font-[family-name:var(--font-space-grotesk)] text-sm font-medium tracking-tight text-[var(--color-ink)] transition-colors hover:text-[var(--color-lime)]"
        >
          serahbobin
        </Link>
        <nav className="flex items-center gap-6 text-xs font-medium tracking-wide uppercase text-[var(--color-muted-ink)]">
          <Link href="/work" className="transition-colors hover:text-[var(--color-ink)]">
            Work
          </Link>
          <Link href="/blog" className="transition-colors hover:text-[var(--color-ink)]">
            Blog
          </Link>
          <Link href="/about" className="transition-colors hover:text-[var(--color-ink)]">
            About
          </Link>
        </nav>
      </header>
      {children}
    </>
  );
}
