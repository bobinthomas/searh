"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { mediaUrl } from "@/lib/images";
import { revealBatch } from "@/components/anim/Reveal";
import { attachHoverScale } from "@/components/anim/hoverScale";

type Project = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  cover_path: string | null;
  published_at: string | null;
};

export function WorkGrid({ projects }: { projects: Project[] }) {
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const imgRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    return revealBatch(cardRefs.current, { y: 64, scale: 0.92, stagger: 0.12 });
  }, [projects.length]);

  useEffect(() => {
    const cleanups = imgRefs.current.map((el) => attachHoverScale(el, 1.08));
    return () => cleanups.forEach((fn) => fn());
  }, [projects.length]);

  return (
    <div className="mt-12 grid gap-8 sm:grid-cols-2">
      {projects.map((project, i) => {
        const cover = mediaUrl(project.cover_path);
        return (
          <Link
            key={project.id}
            href={`/work/${project.slug}`}
            ref={(el) => {
              cardRefs.current[i] = el;
            }}
            className="group block"
          >
            {cover && (
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded bg-[var(--color-ink)]/5">
                <Image
                  ref={(el) => {
                    imgRefs.current[i] = el;
                  }}
                  src={cover}
                  alt={project.title}
                  fill
                  sizes="(max-width: 640px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>
            )}
            <span className="mt-3 block font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-muted-ink)]">
              {String(i + 1).padStart(2, "0")} /{" "}
              {project.published_at
                ? project.published_at.slice(0, 10).split("-").reverse().join("/")
                : "—"}
            </span>
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-lg font-medium text-[var(--color-ink)] group-hover:underline">
              {project.title}
            </h2>
            {project.summary && (
              <p className="mt-1 text-sm text-[var(--color-muted-ink)]">
                {project.summary}
              </p>
            )}
          </Link>
        );
      })}
    </div>
  );
}
