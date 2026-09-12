import { Reveal } from "@/components/anim/Reveal";
import { ScrambleText } from "@/components/anim/ScrambleText";
import { GridOverlay } from "@/components/site/GridOverlay";

/**
 * Homepage hero: a hairline grid backdrop, a decode/scramble headline, and
 * the existing tagline paragraph fading in underneath. Sits between the
 * global SiteHeader and the Featured grid.
 */
export function HomeHero() {
  return (
    <section className="relative flex min-h-[90vh] flex-col justify-center overflow-hidden bg-[var(--color-paper)] px-6 py-24 text-[var(--color-ink)]">
      <GridOverlay cols={2} rows={1} />

      <div className="relative mx-auto w-full max-w-4xl">
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted-ink)]">
          serahbobin / sketchbook
        </p>

        <h1 className="mt-6 font-[family-name:var(--font-heavy)] text-4xl leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
          <ScrambleText text="A year of drawing, unedited." />
        </h1>

        <Reveal y={30} scale={0.97} delay={0.5} className="mt-8 max-w-xl">
          <p className="text-lg leading-relaxed text-[var(--color-ink)]/70 sm:text-xl">
            This is my sketchbook: illustration, colour studies, and whatever I
            was practising that week. The pages that didn&apos;t work are
            still here, in order, because that&apos;s where you can actually
            see me thinking.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
