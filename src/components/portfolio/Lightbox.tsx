"use client";

import { useEffect, useRef } from "react";

type Props = {
  work: { title: string; medium: string };
  image: { src: string; width: number; height: number };
  onClose: () => void;
};

export function Lightbox({ work, image, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
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
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={work.title}
      ref={dialogRef}
      onClick={onClose}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-ink/95 p-4"
    >
      <img
        src={image.src}
        alt={work.title}
        width={image.width}
        height={image.height}
        className="max-h-[80vh] w-auto max-w-full object-contain"
        onClick={(e) => e.stopPropagation()}
      />
      <div className="flex w-full max-w-3xl items-baseline justify-between gap-4 font-mono text-xs text-paper">
        <p className="uppercase tracking-widest">
          {work.title} — {work.medium}
        </p>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="bg-lime px-2 py-1 uppercase tracking-widest text-ink"
        >
          Close [esc]
        </button>
      </div>
    </div>
  );
}
