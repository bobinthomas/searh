"use client";

import { useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import { gsap, prefersReducedMotion } from "@/lib/gsap";

type Props = {
  work: { title: string; medium: string };
  image: { src: string; width: number; height: number };
  onClose: () => void;
};

export function Lightbox({ work, image, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const handleClose = useCallback(() => {
    if (prefersReducedMotion() || !dialogRef.current) {
      onClose();
      return;
    }
    const tl = gsap.timeline({ onComplete: onClose });
    tl.to(imgRef.current, { opacity: 0, scale: 0.82, duration: 0.25, ease: "power2.in" }, 0);
    tl.to(dialogRef.current, { opacity: 0, duration: 0.3, ease: "power2.in" }, 0);
  }, [onClose]);

  // Entrance: backdrop fade + image scale in with a slight overshoot.
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        dialogRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: "power2.out" },
      );
      gsap.fromTo(
        imgRef.current,
        { opacity: 0, scale: 0.78, y: 24 },
        { opacity: 1, scale: 1, y: 0, duration: 0.65, ease: "back.out(1.6)" },
      );
    });
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
        return;
      }
      if (e.key !== "Tab") return;
      const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
        "button, a[href]",
      );
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [handleClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={work.title}
      ref={dialogRef}
      onClick={handleClose}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/95 p-4"
    >
      <Image
        ref={imgRef}
        src={image.src}
        alt={work.title}
        width={image.width}
        height={image.height}
        sizes="100vw"
        style={{ width: "auto", height: "auto" }}
        className="max-h-[80vh] w-auto max-w-full object-contain"
        onClick={(e) => e.stopPropagation()}
      />
      <div className="flex w-full max-w-3xl items-baseline justify-between gap-4 font-mono text-xs text-white">
        <p className="uppercase tracking-widest">
          {work.title} — {work.medium}
        </p>
        <button
          ref={closeRef}
          type="button"
          onClick={handleClose}
          className="bg-lime px-2 py-1 uppercase tracking-widest text-black"
        >
          Close [esc]
        </button>
      </div>
    </div>
  );
}
