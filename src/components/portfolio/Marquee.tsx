type Props = {
  items: string[];
  className?: string;
  duration?: number;
};

/** CSS-only marquee: one translate on a duplicated list. Stops under reduced motion. */
export function Marquee({ items, className = "", duration = 40 }: Props) {
  const line = items.join("   ·   ");
  return (
    <div
      aria-hidden="true"
      className={`overflow-hidden border-b border-ink font-mono text-[11px] uppercase tracking-[0.18em] ${className}`}
    >
      <div
        className="marquee-track flex w-max gap-8 whitespace-nowrap py-1"
        style={{ animationDuration: `${duration}s` }}
      >
        <span>{line}</span>
        <span>{line}</span>
      </div>
    </div>
  );
}
