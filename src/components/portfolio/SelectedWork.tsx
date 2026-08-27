import Image from "next/image";
import { images, type Work } from "@/data/content";

type Props = {
  works: Work[];
  onOpen: (work: Work) => void;
};

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2 border-b border-border py-[3px] last:border-b-0">
      <dt className="w-[64px] shrink-0 uppercase tracking-[0.12em] text-muted-ink">
        {k}
      </dt>
      <dd className="min-w-0 flex-1 text-ink">{v}</dd>
    </div>
  );
}

export function SelectedWork({ works, onOpen }: Props) {
  return (
    <div className="divide-y divide-ink">
      {works.map((work, i) => {
        const img = images[work.file];
        if (!img) return null;
        return (
          <article
            key={work.id}
            className="grid gap-2.5 p-2.5 md:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]"
          >
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
                loading="lazy"
                sizes="(max-width: 768px) 100vw, 66vw"
                style={{ width: "auto", height: "auto" }}
                className="mx-auto block h-auto max-h-[540px] w-auto"
              />
            </button>

            <div className="border border-ink bg-lime font-mono text-[11px] font-medium uppercase leading-5">
              <div className="flex items-center justify-between gap-2 border-b border-ink px-2 py-1 uppercase tracking-[0.14em]">
                <span className="truncate">{work.title}</span>
                <span className="shrink-0 tabular-nums text-muted-ink">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <dl className="px-2 py-1">
                <Row k="Date" v={work.date.split("-").reverse().join("/")} />
                <Row k="Medium" v={work.medium} />
                <Row k="Time" v={work.time} />
              </dl>
              <p className="border-t border-ink px-2 py-2 text-ink">
                <span className="text-ink">● </span>
                {work.note}
              </p>
            </div>
          </article>
        );
      })}
    </div>
  );
}
