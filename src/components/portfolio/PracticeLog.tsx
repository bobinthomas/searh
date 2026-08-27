import type { LogEntry } from "@/data/content";

function ddmmyyyy(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function PracticeLog({ entries }: { entries: LogEntry[] }) {
  return (
    <ul className="divide-y divide-paper/15 bg-ink font-mono text-[12px] font-medium leading-5">
      {entries.map((e) => (
        <li
          key={`${e.date}-${e.text}`}
          className="flex items-baseline gap-2 px-2.5 py-[5px]"
        >
          <span className="w-[72px] shrink-0 uppercase tracking-[0.08em] text-lime">
            {e.kind}
          </span>
          <span className="min-w-0 flex-1 truncate uppercase text-paper">{e.text}</span>
          <span className="shrink-0 tabular-nums text-paper/60">
            {ddmmyyyy(e.date)}
          </span>
        </li>
      ))}
    </ul>
  );
}
