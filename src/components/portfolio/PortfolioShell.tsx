"use client";

import { useState } from "react";
import { Lightbox } from "@/components/portfolio/Lightbox";
import { AutoScrollColumn } from "@/components/portfolio/AutoScrollColumn";
import { Tile } from "@/components/portfolio/Tile";
import { mediaUrl } from "@/lib/images";

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

export type LogEntry = { date: string; kind: string; text: string };

type Props = {
  sketchbook: PortfolioWork[];
  selected: PortfolioWork[];
  log: LogEntry[];
};

function ddmmyyyy(iso: string) {
  return iso.split("-").reverse().join("/");
}

export default function PortfolioShell({ sketchbook, selected, log }: Props) {
  const [open, setOpen] = useState<PortfolioWork | null>(null);

  // Two mosaic columns, alternating so the feed stays reverse-chronological
  const feed = [...sketchbook, ...sketchbook];
  const leftColumn = feed.filter((_, i) => i % 2 === 0);
  const rightColumn = feed.filter((_, i) => i % 2 === 1);

  const nav = [
    ["Work", "#work"],
    ["Selected", "#selected"],
    ["Log", "#log"],
    ["About", "#about"],
    ["Contact", "#contact"],
  ] as const;

  const openCover = open ? mediaUrl(open.cover_path) : undefined;

  return (
    <div className="min-h-screen bg-void text-paper">
      {/* fixed page chrome */}
      <div className="pointer-events-none fixed inset-0 z-40 hidden md:block">
        <a
          href="#top"
          className="pointer-events-auto absolute left-6 top-5 chrome-chip px-2 py-1 font-display text-[15px] font-medium text-paper backdrop-blur-sm"
        >
          serahbobin
        </a>
        <a
          href="mailto:hello@serahbobin.com"
          className="pointer-events-auto absolute right-6 top-5 border border-paper/40 bg-lime px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-ink"
        >
          Email
        </a>
        <nav className="pointer-events-auto absolute left-6 top-1/2 -translate-y-1/2">
          <ul className="space-y-1">
            {nav.map(([label, href]) => (
              <li key={label}>
                <a
                  href={href}
                  className="inline-block chrome-chip px-2 py-0.5 font-mono text-[12px] font-medium text-paper backdrop-blur-sm hover:text-lime"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <span className="absolute bottom-5 left-6 chrome-chip px-2 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-paper backdrop-blur-sm">
          ©2026 serahbobin
        </span>
      </div>

      {/* mobile bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-void-line bg-void px-4 py-3 md:hidden">
        <span className="font-display text-[15px] font-medium">serahbobin</span>
        <a
          href="mailto:hello@serahbobin.com"
          className="bg-lime px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-ink"
        >
          Email
        </a>
      </header>

      <main id="top">
        {/* hero mosaic: sticky statement beside a scrolling grid of drawings */}
        <section id="work" className="grid grid-cols-2 md:grid-cols-2">
          {/* desktop: pinned, continuously auto-scrolling sketchbook strip */}
          <div className="hidden md:sticky md:top-0 md:block md:h-screen">
            <AutoScrollColumn duration={45}>
              {sketchbook.map((w, i) => (
                <Tile key={`a-${w.id}-${i}`} work={w} index={i} onOpen={setOpen} />
              ))}
            </AutoScrollColumn>
          </div>

          {/* mobile: static column (no auto-scroll on small screens) */}
          <div className="col-span-2 md:hidden">
            {leftColumn.map((w, i) => (
              <Tile key={`l-${w.id}-${i}`} work={w} index={i * 2} onOpen={setOpen} />
            ))}
          </div>

          <div className="col-span-2 md:col-span-1">
            <div className="sticky top-0 flex min-h-[70vh] flex-col justify-between px-6 py-16 md:h-screen md:px-12 md:py-20">
              <div />
              <h1 className="max-w-[16ch] font-display text-4xl font-medium leading-[1.05] tracking-[-0.02em] sm:text-5xl md:text-[3.4rem]">
                Drawing from observation, every day, in Kerala.
              </h1>
              <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[11px] uppercase tracking-[0.18em] text-void-muted">
                <span>{sketchbook.length} pages</span>
                <span>Graphite / Ink / Gouache</span>
                <span className="text-lime">NID · NIFT · UCEED 2026</span>
              </div>
            </div>
            {rightColumn.map((w, i) => (
              <Tile key={`r-${w.id}-${i}`} work={w} index={i * 2 + 1} onOpen={setOpen} />
            ))}
          </div>
        </section>

        {/* selected work */}
        <section id="selected" className="border-t border-void-line">
          <div className="flex items-baseline justify-between px-4 py-6 md:px-12">
            <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-void-muted">
              Selected work
            </h2>
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-void-muted">
              {selected.length} pieces
            </span>
          </div>

          {selected.map((work, i) => {
            const imgSrc = mediaUrl(work.cover_path);
            if (!imgSrc) return null;
            return (
              <article
                key={work.id}
                className="grid gap-8 border-t border-void-line px-4 py-10 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] md:px-12 md:py-16"
              >
                <button
                  type="button"
                  onClick={() => setOpen(work)}
                  className="block w-full bg-void-2"
                >
                  <img
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
                  <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-lime">
                    {String(i + 1).padStart(2, "0")} /{" "}
                    {work.published_at
                      ? ddmmyyyy(work.published_at.slice(0, 10))
                      : "—"}
                  </span>
                  <h3 className="mt-3 font-display text-2xl font-medium tracking-[-0.01em] md:text-3xl">
                    {work.title}
                  </h3>
                  <p className="mt-4 max-w-prose leading-relaxed text-paper/80">
                    {work.note}
                  </p>
                  <dl className="mt-6 border-t border-void-line font-mono text-[11px] uppercase tracking-[0.14em]">
                    {([
                      ["Medium", work.medium],
                      ["Time", work.time],
                    ] as const).map(([k, v]) => (
                      <div key={k} className="flex gap-4 border-b border-void-line py-2">
                        <dt className="w-[70px] shrink-0 text-void-muted">{k}</dt>
                        <dd className="min-w-0 flex-1">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </article>
            );
          })}
        </section>

        {/* log */}
        <section id="log" className="border-t border-void-line px-4 py-10 md:px-12 md:py-16">
          <div className="flex items-baseline justify-between">
            <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-void-muted">
              Practice log
            </h2>
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-void-muted">
              failures kept on purpose
            </span>
          </div>
          <ul className="mt-6 font-mono text-[12px] leading-6">
            {log.map((e) => (
              <li
                key={`${e.date}-${e.text}`}
                className="flex items-baseline gap-3 border-b border-void-line py-2"
              >
                <span className="w-[86px] shrink-0 uppercase tracking-[0.14em] text-lime">
                  {e.kind}
                </span>
                <span className="min-w-0 flex-1 truncate text-paper/85">{e.text}</span>
                <span className="shrink-0 tabular-nums text-void-muted">
                  {ddmmyyyy(e.date)}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* about + contact */}
        <section
          id="about"
          className="grid gap-10 border-t border-void-line px-4 py-12 md:grid-cols-2 md:px-12 md:py-20"
        >
          <div>
            <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-void-muted">
              About
            </h2>
            <p className="mt-5 max-w-prose text-lg leading-relaxed text-paper/85">
              I am a student in Kerala, drawing daily since 2023. Most of what is
              here is unfinished — I keep the failures up because they are the part
              I learn from and the part I can actually talk about. I want to study
              design so I can keep drawing with people who push harder than I do.
            </p>
          </div>

          <div id="contact">
            <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-void-muted">
              Contact
            </h2>
            <ul className="mt-5 font-mono text-[12px] uppercase tracking-[0.14em]">
              {([
                ["Email", "hello@serahbobin.com", "mailto:hello@serahbobin.com"],
                ["Instagram", "@serahbobin", "https://instagram.com/serahbobin"],
                ["Location", "Kerala, India", ""],
              ] as const).map(([k, v, href]) => (
                <li key={k} className="flex gap-4 border-b border-void-line py-2.5">
                  <span className="w-[86px] shrink-0 text-void-muted">{k}</span>
                  {href ? (
                    <a
                      href={href}
                      target={href.startsWith("http") ? "_blank" : undefined}
                      rel={href.startsWith("http") ? "me noreferrer" : undefined}
                      className="min-w-0 flex-1 truncate text-lime underline underline-offset-4"
                    >
                      {v}
                    </a>
                  ) : (
                    <span className="min-w-0 flex-1 truncate">{v}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <footer className="flex items-center justify-between border-t border-void-line px-4 py-5 font-mono text-[10px] uppercase tracking-[0.2em] text-void-muted md:px-12">
          <span>©2026 serahbobin</span>
          <span className="text-lime">Drawing daily</span>
        </footer>
      </main>

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
