import Image from "next/image";
import type { PortfolioWork } from "@/components/portfolio/PortfolioShell";
import { mediaUrl } from "@/lib/images";

type Props = {
  work: PortfolioWork;
  index: number;
  onOpen: (work: PortfolioWork) => void;
};

/** Full-bleed image cell with metadata revealed on hover/focus. */
export function Tile({ work, index, onOpen }: Props) {
  const imgSrc = mediaUrl(work.cover_path);
  if (!imgSrc) return null;

  return (
    <button
      type="button"
      onClick={() => onOpen(work)}
      className="group relative block aspect-[4/5] w-full overflow-hidden bg-void-2 text-left"
    >
      <Image
        src={imgSrc}
        alt={work.alt}
        fill
        sizes="(max-width: 768px) 100vw, 50vw"
        priority={index < 2}
        className="object-cover"
      />
      <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-void/90 to-transparent p-4 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
        <span className="min-w-0">
          <span className="block truncate font-display text-[15px] font-medium text-paper">
            {work.title}
          </span>
          <span className="mt-0.5 block truncate font-mono text-[10px] uppercase tracking-[0.18em] text-void-muted">
            {work.medium}
          </span>
        </span>
        <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-lime">
          {String(index + 1).padStart(2, "0")}
        </span>
      </span>
    </button>
  );
}
