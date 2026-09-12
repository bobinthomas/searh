"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/lib/gsap";

type Props = {
  children: ReactNode;
  className?: string;
  /** Starting vertical offset in px. */
  y?: number;
  /** Starting scale (1 = no scale change). */
  scale?: number;
  delay?: number;
  duration?: number;
};

/** Scroll-triggered fade/slide/scale-in for a single block. */
export function Reveal({
  children,
  className,
  y = 48,
  scale = 0.92,
  delay = 0,
  duration = 0.9,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (prefersReducedMotion()) {
      gsap.set(el, { opacity: 1, y: 0, scale: 1 });
      return;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { opacity: 0, y, scale },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration,
          delay,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start: "top 88%",
            toggleActions: "play none none none",
          },
        },
      );
    });

    return () => ctx.revert();
  }, [y, scale, delay, duration]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

/**
 * Attach to a list of item refs to stagger them in as a group scrolls into
 * view. Call once from a useEffect after refs are populated.
 */
export function revealBatch(
  items: (Element | null)[],
  opts: { y?: number; scale?: number; stagger?: number } = {},
) {
  const els = items.filter((el): el is Element => el !== null);
  if (els.length === 0) return () => {};

  if (prefersReducedMotion()) {
    gsap.set(els, { opacity: 1, y: 0, scale: 1 });
    return () => {};
  }

  const { y = 56, scale = 0.88, stagger = 0.08 } = opts;

  const ctx = gsap.context(() => {
    gsap.set(els, { opacity: 0, y, scale });
    ScrollTrigger.batch(els, {
      start: "top 92%",
      once: true,
      onEnter: (batch) =>
        gsap.to(batch, {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.85,
          stagger,
          ease: "power3.out",
          overwrite: true,
        }),
    });
  });

  return () => ctx.revert();
}
