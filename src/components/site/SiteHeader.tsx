"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "@/lib/gsap";
import { attachHoverScale } from "@/components/anim/hoverScale";
import { ThemeToggle } from "@/components/site/ThemeToggle";

const NAV = [
  { label: "featured", href: "/" },
  { label: "work", href: "/work" },
  { label: "blog", href: "/blog" },
  { label: "about", href: "/about" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const rootRef = useRef<HTMLElement>(null);
  const navRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  // Entrance: wordmark, tagline, nav stagger in on first load.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || prefersReducedMotion()) return;

    const targets = el.querySelectorAll("[data-reveal]");
    const ctx = gsap.context(() => {
      gsap.fromTo(
        targets,
        { opacity: 0, y: -28, scale: 0.92 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.9,
          stagger: 0.12,
          ease: "back.out(1.6)",
        },
      );
    });

    return () => ctx.revert();
  }, []);

  // Expressive hover scale on nav links.
  useEffect(() => {
    const cleanups = navRefs.current.map((el) => attachHoverScale(el, 1.12));
    return () => cleanups.forEach((fn) => fn());
  }, []);

  return (
    <header
      ref={rootRef}
      className="relative grid grid-cols-1 gap-3 border-b border-[var(--color-ink)]/10 bg-[var(--color-paper)] px-4 py-6 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-0 sm:divide-x sm:divide-[var(--color-ink)]/10 md:px-12"
    >
      <span
        aria-hidden="true"
        className="absolute left-4 top-4 hidden h-3 w-3 sm:block"
      >
        <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-[var(--color-ink)]/25" />
        <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-[var(--color-ink)]/25" />
      </span>
      <span
        aria-hidden="true"
        className="absolute right-4 top-4 hidden h-3 w-3 sm:block"
      >
        <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-[var(--color-ink)]/25" />
        <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-[var(--color-ink)]/25" />
      </span>

      <div className="sm:pr-6">
        <Link
          href="/"
          data-reveal
          className="inline-block font-[family-name:var(--font-display)] text-xl font-bold tracking-tight text-[var(--color-ink)] sm:text-2xl"
        >
          serahbobin
        </Link>
      </div>

      <div className="sm:px-6">
        <p data-reveal className="text-sm italic text-[var(--color-muted-ink)]">
          illustration, sketchbook &amp; graphic design
        </p>
      </div>

      <nav className="flex flex-wrap items-center gap-5 text-sm sm:justify-end sm:pl-6">
        {NAV.map((item, i) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              data-reveal
              ref={(el) => {
                navRefs.current[i] = el;
              }}
              className={
                active
                  ? "inline-block font-medium text-[var(--color-ink)]"
                  : "inline-block text-[var(--color-muted-ink)] transition-colors hover:text-[var(--color-ink)]"
              }
            >
              {item.label}
            </Link>
          );
        })}
        <ThemeToggle />
      </nav>
    </header>
  );
}
