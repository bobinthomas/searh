import type { Metadata } from "next";
import { Reveal } from "@/components/anim/Reveal";
import { ScrambleText } from "@/components/anim/ScrambleText";
import { GridOverlay } from "@/components/site/GridOverlay";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "About",
  description:
    "About serahbobin — illustration, sketchbook, NID, NIFT and UCEED preparation.",
};

const contact = [
  ["Email", "hello@serahbobin.com", "mailto:hello@serahbobin.com"],
  ["Instagram", "@serahbobin", "https://instagram.com/serahbobin"],
  ["Location", "Kerala, India", ""],
] as const;

export default function AboutPage() {
  return (
    <main className="relative min-h-screen bg-[var(--color-paper)] px-6 py-24">
      <GridOverlay cols={1} rows={1} />
      <div className="relative mx-auto grid max-w-4xl gap-12 md:grid-cols-2">
        <Reveal y={40} scale={0.95}>
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-medium tracking-tight text-[var(--color-ink)] md:text-5xl">
            <ScrambleText text="About" />
          </h1>
          <p className="mt-6 max-w-prose text-lg leading-relaxed text-[var(--color-muted-ink)]">
            I am a student in Kerala, drawing daily since 2023. Most of what is
            here is unfinished — I keep the failures up because they are the
            part I learn from and the part I can actually talk about. I want
            to study design so I can keep drawing with people who push harder
            than I do.
          </p>
        </Reveal>

        <Reveal y={40} scale={0.95} delay={0.15}>
          <h2 className="font-mono text-xs font-bold uppercase tracking-[0.24em] text-[var(--color-muted-ink)]">
            Contact
          </h2>
          <ul className="mt-5 font-mono text-sm uppercase tracking-[0.1em]">
            {contact.map(([label, value, href]) => (
              <li
                key={label}
                className="flex gap-4 border-b border-[var(--color-ink)]/10 py-3"
              >
                <span className="w-24 shrink-0 text-[var(--color-muted-ink)]">
                  {label}
                </span>
                {href ? (
                  <a
                    href={href}
                    target={href.startsWith("http") ? "_blank" : undefined}
                    rel={href.startsWith("http") ? "me noreferrer" : undefined}
                    className="min-w-0 flex-1 truncate text-[var(--color-ink)] underline underline-offset-4 hover:opacity-60"
                  >
                    {value}
                  </a>
                ) : (
                  <span className="min-w-0 flex-1 truncate text-[var(--color-ink)]">
                    {value}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </main>
  );
}
