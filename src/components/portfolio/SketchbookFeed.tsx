import Image from "next/image";
import { images, type Work } from "@/data/content";

type Props = {
  works: Work[];
  onOpen: (work: Work) => void;
};

function shortDate(iso: string) {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

export function SketchbookFeed({ works, onOpen }: Props) {
  return (
    <div className="columns-2 gap-2.5 md:columns-3 lg:columns-4">
      {works.map((work, i) => {
        const img = images[work.file];
        if (!img) return null;
        return (
          <figure key={work.id} className="mb-2.5 break-inside-avoid">
            <button
              type="button"
              onClick={() => onOpen(work)}
              className="block w-full border border-ink bg-paper"
            >
              <Image
                src={img.src}
                alt={work.alt}
                width={img.width}
                height={img.height}
                priority={i < 3}
                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                style={{ width: "100%", height: "auto" }}
                className="block h-auto w-full"
              />
            </button>
            <figcaption className="mt-1 flex items-baseline justify-between gap-2 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-muted-ink">
              <span className="truncate">
                <span className="bg-lime px-1 text-ink">▸</span>{" "}
                {work.title}
              </span>
              <span className="shrink-0 tabular-nums">{shortDate(work.date)}</span>
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}
