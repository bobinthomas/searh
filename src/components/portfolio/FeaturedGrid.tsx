"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import type { PortfolioWork } from "@/components/portfolio/PortfolioShell";
import { mediaUrl } from "@/lib/images";
import { revealBatch } from "@/components/anim/Reveal";
import { attachHoverScale } from "@/components/anim/hoverScale";

type Props = {
  works: PortfolioWork[];
};

/**
 * Grid framed by hairlines, each tile a cover image (with a medium tag, when
 * set) plus a permanent caption row below — title left, year right. Each
 * tile is a gateway into that project's own page (its full set of images),
 * not a single-image lightbox.
 */
export function FeaturedGrid({ works }: Props) {
  const cellRefs = useRef<(HTMLElement | null)[]>([]);
  const imgRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    return revealBatch(cellRefs.current, { y: 60, scale: 0.85, stagger: 0.09 });
  }, [works.length]);

  useEffect(() => {
    const cleanups = imgRefs.current.map((el) => attachHoverScale(el, 1.06));
    return () => cleanups.forEach((fn) => fn());
  }, [works.length]);

  return (
    <div className="grid grid-cols-2 border-l border-t border-[var(--color-ink)]/10">
      {works.map((work, i) => {
        const src = mediaUrl(work.cover_path);
        if (!src) return null;
        const year = work.published_at ? work.published_at.slice(0, 4) : null;
        return (
          <div
            key={work.id}
            ref={(el) => {
              cellRefs.current[i] = el;
            }}
            className="border-b border-r border-[var(--color-ink)]/10"
          >
            <Link
              href={`/work/${work.slug}`}
              className="relative block aspect-[4/3] w-full overflow-hidden"
            >
              <Image
                ref={(el) => {
                  imgRefs.current[i] = el;
                }}
                src={src}
                alt={work.alt}
                fill
                sizes="50vw"
                priority={i < 4}
                className="object-cover"
              />
              {work.medium && (
                <span className="absolute right-3 top-3 rounded-sm bg-[var(--color-lime)] px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wide text-black">
                  {work.medium}
                </span>
              )}
            </Link>

            <div className="flex items-baseline justify-between px-3 py-3 font-mono text-[11px] uppercase tracking-[0.2em]">
              <span className="truncate text-[var(--color-ink)]">{work.title}</span>
              {year && (
                <span className="shrink-0 pl-3 text-[var(--color-muted-ink)]">{year}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
