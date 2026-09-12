"use client";

import { useEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "@/lib/gsap";

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";

function randomGlyph() {
  return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
}

type Props = {
  text: string;
  className?: string;
  delay?: number;
  /** Reveal when scrolled into view instead of immediately on mount. */
  onScroll?: boolean;
};

/**
 * Decode/glitch text reveal: characters cycle through random glyphs and lock
 * in left-to-right until the real text settles. Driven by a plain GSAP tween
 * over a progress value (no premium plugin required).
 */
export function ScrambleText({ text, className, delay = 0, onScroll = false }: Props) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (prefersReducedMotion()) {
      el.textContent = text;
      return;
    }

    const chars = text.split("");
    const state = { progress: 0 };

    const render = () => {
      const revealCount = Math.floor(state.progress * chars.length);
      el.textContent = chars
        .map((ch, i) => (ch === " " || i < revealCount ? ch : randomGlyph()))
        .join("");
    };

    render();

    const tween = gsap.to(state, {
      progress: 1,
      duration: Math.max(0.6, chars.length * 0.035),
      delay,
      ease: "power1.inOut",
      onUpdate: render,
      ...(onScroll
        ? {
            scrollTrigger: {
              trigger: el,
              start: "top 88%",
              toggleActions: "play none none none",
            },
          }
        : {}),
    });

    return () => {
      tween.kill();
      el.textContent = text;
    };
  }, [text, delay, onScroll]);

  return (
    <span ref={ref} aria-label={text} className={className}>
      {text}
    </span>
  );
}
