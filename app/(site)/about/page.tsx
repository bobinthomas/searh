import type { Metadata } from "next";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "About",
  description:
    "About serahbobin — illustration, sketchbook, NID, NIFT and UCEED preparation.",
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[var(--color-paper)] px-6 py-24">
      <div className="mx-auto max-w-4xl">
        <h1 className="font-[family-name:var(--font-space-grotesk)] text-4xl font-medium tracking-tight text-[var(--color-ink)] md:text-5xl">
          About
        </h1>
        <p className="mt-4 text-lg text-[var(--color-muted-ink)]">
          About page coming soon.
        </p>
      </div>
    </main>
  );
}
