import type { ReactNode } from "react";

type Props = {
  label: string;
  meta?: ReactNode;
  id?: string;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
};

/** A bounded block on the sheet: tiny uppercase label, metadata, content. */
export function Module({
  label,
  meta,
  id,
  className = "",
  bodyClassName = "p-2.5",
  children,
}: Props) {
  return (
    <section
      aria-labelledby={id ? `${id}-label` : undefined}
      className={`min-w-0 border-b border-r border-ink ${className}`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-ink bg-lime px-2.5 py-1">
        <h2
          id={id ? `${id}-label` : undefined}
          className="font-display text-[12px] font-bold uppercase tracking-[0.16em] text-ink"
        >
          {label}
        </h2>
        {meta ? (
          <span className="truncate font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-ink/70">
            {meta}
          </span>
        ) : null}
      </div>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}
