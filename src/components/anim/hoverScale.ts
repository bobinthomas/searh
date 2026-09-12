import { gsap, prefersReducedMotion } from "@/lib/gsap";

/**
 * Attaches an expressive, slightly-overshooting hover scale to an element.
 * Returns a cleanup function to remove the listeners.
 */
export function attachHoverScale(
  el: Element | null,
  scale = 1.06,
): () => void {
  if (!el || prefersReducedMotion()) return () => {};

  const onEnter = () =>
    gsap.to(el, { scale, duration: 0.5, ease: "back.out(2)", overwrite: true });
  const onLeave = () =>
    gsap.to(el, { scale: 1, duration: 0.4, ease: "power2.out", overwrite: true });

  el.addEventListener("mouseenter", onEnter);
  el.addEventListener("mouseleave", onLeave);

  return () => {
    el.removeEventListener("mouseenter", onEnter);
    el.removeEventListener("mouseleave", onLeave);
  };
}
