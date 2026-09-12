"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import type { PortfolioWork } from "@/components/portfolio/PortfolioShell";
import { mediaUrl } from "@/lib/images";
import { revealBatch } from "@/components/anim/Reveal";
import { attachHoverScale } from "@/components/anim/hoverScale";

type Props = {
  works: PortfolioWork[];
  onOpen: (work: PortfolioWork) => void;
};

/** Full-bleed grid, no captions or hover chrome — just the image. */
export function FeaturedGrid({ works, onOpen }: Props) {
  const cellRefs = useRef<(HTMLElement | null)[]>([]);
  const imgRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    return revealBatch(cellRefs.current, { y: 60, scale: 0.85, stagger: 0.09 });
  }, [works.length]);

  useEffect(() => {
    const cleanups = imgRefs.current.map((el) => attachHoverScale(el, 1.1));
    return () => cleanups.forEach((fn) => fn());
  }, [works.length]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
      {works.map((work, i) => {
        const src = mediaUrl(work.cover_path);
        if (!src) return null;
        return (
          <button
            key={work.id}
            type="button"
            onClick={() => onOpen(work)}
            ref={(el) => {
              cellRefs.current[i] = el;
            }}
            className="relative block aspect-square w-full overflow-hidden"
          >
            <Image
              ref={(el) => {
                imgRefs.current[i] = el;
              }}
              src={src}
              alt={work.alt}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              priority={i < 4}
              className="object-cover"
            />
          </button>
        );
      })}
    </div>
  );
}
