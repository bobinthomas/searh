import Link from "next/link";

const NAV_LINKS = [
  { label: "Work", href: "/work" },
  { label: "Blog", href: "/blog" },
  { label: "About", href: "/about" },
];

/**
 * Sitewide footer: copyright + a row of grid-divided columns (status / say
 * hi / navigate), rendered once from the (site) layout so it's consistent
 * across every page.
 */
export function SiteFooter() {
  return (
    <footer className="grid grid-cols-1 gap-6 border-t border-[var(--color-ink)]/10 bg-[var(--color-ink)]/[0.03] px-4 py-8 text-sm sm:grid-cols-[1.2fr_1fr_1fr_1fr] sm:gap-0 sm:divide-x sm:divide-[var(--color-ink)]/10 md:px-12">
      <div className="flex items-center font-medium text-[var(--color-ink)] sm:pr-6">
        © {new Date().getFullYear()} serahbobin
      </div>

      <div className="sm:px-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-muted-ink)]">
          Status
        </p>
        <p className="mt-2 max-w-[24ch] text-[var(--color-ink)]/80">
          Drawing daily — preparing NID, NIFT &amp; UCEED portfolios.
        </p>
      </div>

      <div className="sm:px-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-muted-ink)]">
          Say hi
        </p>
        <p className="mt-2 text-[var(--color-ink)]">
          <a
            href="https://instagram.com/serahbobin"
            target="_blank"
            rel="me noreferrer"
            className="underline underline-offset-4 hover:opacity-60"
          >
            Instagram
          </a>
        </p>
      </div>

      <div className="sm:px-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-muted-ink)]">
          Navigate
        </p>
        <p className="mt-2 text-[var(--color-ink)]">
          {NAV_LINKS.map((link, i) => (
            <span key={link.href}>
              <Link href={link.href} className="underline underline-offset-4 hover:opacity-60">
                {link.label}
              </Link>
              {i < NAV_LINKS.length - 1 ? ", " : ""}
            </span>
          ))}
        </p>
      </div>
    </footer>
  );
}
