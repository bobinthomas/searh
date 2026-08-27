import type { Metadata } from "next";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Notes on drawing, illustration practice, and applications by serahbobin.",
};

export default function BlogPage() {
  return (
    <main className="min-h-screen bg-[var(--color-paper)] px-6 py-24">
      <div className="mx-auto max-w-4xl">
        <h1 className="font-[family-name:var(--font-space-grotesk)] text-4xl font-medium tracking-tight text-[var(--color-ink)] md:text-5xl">
          Blog
        </h1>
        <p className="mt-4 text-lg text-[var(--color-muted-ink)]">
          Posts coming soon.
        </p>
      </div>
    </main>
  );
}
