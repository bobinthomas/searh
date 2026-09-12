"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "@/lib/gsap";
import { attachHoverScale } from "@/components/anim/hoverScale";

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

  // Entrance: wordmark, email, tagline, nav stagger in on first load.
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
      className="border-b border-[var(--color-ink)]/10 bg-[var(--color-paper)] px-6 py-10 text-center"
    >
      <Link
        href="/"
        data-reveal
        className="inline-block font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-[var(--color-ink)] sm:text-3xl"
      >
        serahbobin
      </Link>
      <p
        data-reveal
        className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-[var(--color-muted-ink)]"
      >
        <a href="mailto:hello@serahbobin.com" className="hover:text-[var(--color-ink)]">
          hello@serahbobin.com
        </a>
      </p>
      <p data-reveal className="mt-2 text-sm italic text-[var(--color-muted-ink)]">
        illustration, sketchbook &amp; graphic design
      </p>

      <nav className="mt-6 flex items-center justify-center gap-6 text-sm">
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
      </nav>
    </header>
  );
}
