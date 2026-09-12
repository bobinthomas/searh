"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/lib/gsap";

const WORD = "serah.";
const BG_START = "#f2ead9";
const BG_END = "#dcc4a0";

/**
 * Bold intro hero for the homepage only — sits between the site's light
 * global header and the light Featured grid below it. Has no navbar of its
 * own; SiteHeader above already owns navigation.
 *
 * The wordmark starts as flat giant type, then as the section scrolls past
 * (pinned via CSS `sticky`), each letter is individually repositioned and
 * rotated along a tight arc — packed close enough that the bold strokes
 * overlap into a continuous curved band — until the word coils into a
 * loop. Scroll progress drives the morph directly (scrubbed). Once the
 * curl is mostly complete, the tagline and intro copy reveal underneath,
 * and the background warms from cream to tan.
 */
export function HomeHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const wordRowRef = useRef<HTMLDivElement>(null);
  const letterRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const revealRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const row = wordRowRef.current;
    const reveal = revealRef.current;
    if (!section || !row || !reveal) return;

    if (prefersReducedMotion()) {
      gsap.set(reveal, { opacity: 1, y: 0 });
      return;
    }

    const ctx = gsap.context(() => {
      const letters = letterRefs.current.filter(
        (el): el is HTMLSpanElement => el !== null,
      );
      if (letters.length === 0) return;

      const containerRect = row.getBoundingClientRect();
      const cx = containerRect.left + containerRect.width / 2;
      const cy = containerRect.top + containerRect.height / 2;

      const rest = letters.map((el) => {
        const r = el.getBoundingClientRect();
        return {
          x: r.left + r.width / 2 - cx,
          y: r.top + r.height / 2 - cy,
        };
      });

      // Tight radius + narrow sweep so adjacent letters' bold strokes
      // overlap once curved, reading as one continuous band rather than
      // separated rotated glyphs.
      const radius = Math.min(containerRect.width * 0.24, 170);
      const arcStart = 235;
      const arcSweep = -160;

      const targets = letters.map((_, i) => {
        const t = letters.length === 1 ? 0 : i / (letters.length - 1);
        const angleDeg = arcStart + arcSweep * t;
        const angleRad = (angleDeg * Math.PI) / 180;
        return {
          arcX: Math.cos(angleRad) * radius,
          arcY: Math.sin(angleRad) * radius * 0.6 + radius * 0.15,
          rot: angleDeg + 90,
        };
      });

      ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.6,
        onUpdate: (self) => {
          const p = self.progress;
          const revealP = gsap.utils.clamp(0, 1, (p - 0.55) / 0.45);
          const letterFade = gsap.utils.interpolate(1, 0.35, revealP);

          letters.forEach((el, i) => {
            const { arcX, arcY, rot } = targets[i]!;
            const { x: rx, y: ry } = rest[i]!;
            gsap.set(el, {
              x: gsap.utils.interpolate(0, arcX - rx, p),
              y: gsap.utils.interpolate(0, arcY - ry, p),
              rotation: gsap.utils.interpolate(0, rot, p),
              scale: gsap.utils.interpolate(1, 1.15, p),
              opacity: letterFade,
            });
          });

          gsap.set(reveal, {
            opacity: revealP,
            y: gsap.utils.interpolate(40, 0, revealP),
          });

          gsap.set(section, {
            backgroundColor: gsap.utils.interpolate(BG_START, BG_END, p),
          });
        },
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative text-[#161310]"
      style={{ height: "230vh", backgroundColor: BG_START }}
    >
      <div className="sticky top-0 h-screen overflow-hidden px-6">
        <div
          ref={wordRowRef}
          className="absolute left-1/2 top-[38%] flex -translate-x-1/2 -translate-y-1/2 select-none"
          aria-label={WORD}
        >
          {WORD.split("").map((ch, i) => (
            <span
              key={i}
              ref={(el) => {
                letterRefs.current[i] = el;
              }}
              aria-hidden="true"
              className="inline-block font-[family-name:var(--font-heavy)] text-6xl lowercase leading-none tracking-tight sm:text-8xl md:text-9xl"
            >
              {ch}
            </span>
          ))}
        </div>

        <div
          ref={revealRef}
          className="absolute left-1/2 top-[70%] w-full max-w-xl -translate-x-1/2 -translate-y-1/2 px-6 text-center opacity-0"
        >
          <p className="font-[family-name:var(--font-display)] text-xl font-medium lowercase leading-tight text-[#161310]/80 sm:text-3xl">
            draws. observes. fails on purpose.
          </p>
          <p className="mt-6 text-base leading-relaxed text-[#161310]/60 sm:text-lg">
            You&apos;re looking at serah&apos;s sketchbook. Illustration,
            colour studies, and drawing practice in all their unfinished
            forms — every failure kept on purpose, because that&apos;s the
            part actually worth showing.
          </p>
        </div>
      </div>
    </section>
  );
}
