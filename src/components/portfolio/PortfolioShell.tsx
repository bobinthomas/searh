"use client";

import { useEffect, useRef, useState } from "react";
import { Lightbox } from "@/components/portfolio/Lightbox";
import { FeaturedGrid } from "@/components/portfolio/FeaturedGrid";
import { mediaUrl } from "@/lib/images";
import { revealBatch } from "@/components/anim/Reveal";
import { attachHoverScale } from "@/components/anim/hoverScale";

/** Shape the server component constructs from Supabase rows. */
export type PortfolioWork = {
  id: string;
  slug: string;
  title: string;
  cover_path: string | null;
  alt: string;
  medium: string;
  time: string;
  note: string;
  published_at: string | null;
};

type Props = {
  featured: PortfolioWork[];
  selected: PortfolioWork[];
};

function ddmmyyyy(iso: string) {
  return iso.split("-").reverse().join("/");
}

export default function PortfolioShell({ featured, selected }: Props) {
  const [open, setOpen] = useState<PortfolioWork | null>(null);
  const openCover = open ? mediaUrl(open.cover_path) : undefined;
  const articleRefs = useRef<(HTMLElement | null)[]>([]);
  const articleImgRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    return revealBatch(articleRefs.current, { y: 70, scale: 0.94, stagger: 0.15 });
  }, [selected.length]);

  useEffect(() => {
    const cleanups = articleImgRefs.current.map((el) => attachHoverScale(el, 1.04));
    return () => cleanups.forEach((fn) => fn());
  }, [selected.length]);

  return (
    <div className="bg-[var(--color-paper)] text-[var(--color-ink)]">
      {/* featured: full-bleed grid, no captions */}
      <section>
        <div className="flex items-baseline justify-between px-4 py-6 md:px-12">
          <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-[var(--color-muted-ink)]">
            Featured
          </h2>
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-muted-ink)]">
            {featured.length} pages
          </span>
        </div>
        <FeaturedGrid works={featured} onOpen={setOpen} />
      </section>

      {/* selected work */}
      <section className="border-t border-[var(--color-ink)]/10">
        <div className="flex items-baseline justify-between px-4 py-6 md:px-12">
          <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-[var(--color-muted-ink)]">
            Selected work
          </h2>
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-muted-ink)]">
            {selected.length} pieces
          </span>
        </div>

        {selected.map((work, i) => {
          const imgSrc = mediaUrl(work.cover_path);
          if (!imgSrc) return null;
          return (
            <article
              key={work.id}
              ref={(el) => {
                articleRefs.current[i] = el;
              }}
              className="grid gap-8 border-t border-[var(--color-ink)]/10 px-4 py-10 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] md:px-12 md:py-16"
            >
              <button
                type="button"
                onClick={() => setOpen(work)}
                className="block w-full overflow-hidden"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={(el) => {
                    articleImgRefs.current[i] = el;
                  }}
                  src={imgSrc}
                  alt={work.alt}
                  width={1600}
                  height={1100}
                  loading="lazy"
                  decoding="async"
                  className="mx-auto block h-auto max-h-[620px] w-auto"
                />
              </button>

              <div className="flex flex-col">
                <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted-ink)]">
                  {String(i + 1).padStart(2, "0")} /{" "}
                  {work.published_at
                    ? ddmmyyyy(work.published_at.slice(0, 10))
                    : "—"}
                </span>
                <h3 className="mt-3 font-display text-2xl font-medium tracking-[-0.01em] md:text-3xl">
                  {work.title}
                </h3>
                <p className="mt-4 max-w-prose leading-relaxed text-[var(--color-ink)]/80">
                  {work.note}
                </p>
                <dl className="mt-6 border-t border-[var(--color-ink)]/10 font-mono text-[11px] uppercase tracking-[0.14em]">
                  {([
                    ["Medium", work.medium],
                    ["Time", work.time],
                  ] as const).map(([k, v]) => (
                    <div
                      key={k}
                      className="flex gap-4 border-b border-[var(--color-ink)]/10 py-2"
                    >
                      <dt className="w-[70px] shrink-0 text-[var(--color-muted-ink)]">
                        {k}
                      </dt>
                      <dd className="min-w-0 flex-1">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </article>
          );
        })}
      </section>

      <footer className="flex items-center justify-between border-t border-[var(--color-ink)]/10 px-4 py-5 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted-ink)] md:px-12">
        <span>©2026 serahbobin</span>
        <span>Drawing daily</span>
      </footer>

      {open && openCover ? (
        <Lightbox
          work={{ title: open.title, medium: open.medium }}
          image={{ src: openCover, width: 1600, height: 1100 }}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </div>
  );
}
