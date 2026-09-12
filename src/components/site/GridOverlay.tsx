type Props = {
  className?: string;
  /** Number of interior vertical dividers. */
  cols?: number;
  /** Number of interior horizontal dividers. */
  rows?: number;
};

/**
 * Decorative hairline grid with small "+" ticks at each intersection.
 * Purely presentational — drop into a `relative` container that defines the
 * area it should cover (a hero, a page header block, etc), never over
 * artwork imagery.
 */
export function GridOverlay({ className, cols = 2, rows = 1 }: Props) {
  const colPositions = Array.from(
    { length: cols },
    (_, i) => ((i + 1) / (cols + 1)) * 100,
  );
  const rowPositions = Array.from(
    { length: rows },
    (_, i) => ((i + 1) / (rows + 1)) * 100,
  );

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ""}`}
    >
      {colPositions.map((pct) => (
        <div
          key={`col-${pct}`}
          className="absolute inset-y-0 w-px bg-[var(--color-ink)]/10"
          style={{ left: `${pct}%` }}
        />
      ))}
      {rowPositions.map((pct) => (
        <div
          key={`row-${pct}`}
          className="absolute inset-x-0 h-px bg-[var(--color-ink)]/10"
          style={{ top: `${pct}%` }}
        />
      ))}
      {colPositions.flatMap((cx) =>
        rowPositions.map((ry) => (
          <span
            key={`tick-${cx}-${ry}`}
            className="absolute block h-3 w-3 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${cx}%`, top: `${ry}%` }}
          >
            <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-[var(--color-ink)]/25" />
            <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-[var(--color-ink)]/25" />
          </span>
        )),
      )}
    </div>
  );
}
