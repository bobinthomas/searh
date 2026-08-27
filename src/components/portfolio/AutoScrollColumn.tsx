import { type ReactNode } from "react";

type Props = {
  children: ReactNode;
  duration?: number;
  className?: string;
};

/**
 * Vertical auto-scrolling marquee. Renders the children twice in a single
 * track and translates it up by 50%, so the loop is seamless. Pauses on
 * hover (so tiles stay clickable) and stops entirely under reduced motion.
 */
export function AutoScrollColumn({ children, duration = 45, className = "" }: Props) {
  return (
    <div className={`auto-scroll-col h-full overflow-hidden ${className}`}>
      <div
        className="auto-scroll-track flex w-full flex-col"
        style={{ animationDuration: `${duration}s` }}
      >
        <div className="flex w-full flex-col">{children}</div>
        <div className="flex w-full flex-col" aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  );
}
