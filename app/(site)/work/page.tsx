import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { mediaUrl } from "@/lib/images";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Work",
  description:
    "Selected illustration and graphic design projects by serahbobin.",
};

async function getProjects() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("projects")
      .select("id, slug, title, summary, cover_path, tags, published_at")
      .eq("status", "published")
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Failed to fetch projects:", error.message);
      return [];
    }
    return data ?? [];
  } catch {
    return [];
  }
}

export default async function WorkPage() {
  const projects = await getProjects();

  return (
    <main className="min-h-screen bg-[var(--color-paper)] px-6 py-24">
      <div className="mx-auto max-w-4xl">
        <h1 className="font-[family-name:var(--font-space-grotesk)] text-4xl font-medium tracking-tight text-[var(--color-ink)] md:text-5xl">
          Work
        </h1>

        {projects.length === 0 ? (
          <p className="mt-4 text-lg text-[var(--color-muted-ink)]">
            Nothing published yet — check back soon.
          </p>
        ) : (
          <div className="mt-12 grid gap-8 sm:grid-cols-2">
            {projects.map((project) => {
              const cover = mediaUrl(project.cover_path);
              return (
                <Link
                  key={project.id}
                  href={`/work/${project.slug}`}
                  className="group block"
                >
                  {cover && (
                    <div className="relative aspect-[4/3] w-full overflow-hidden rounded bg-[var(--color-void-2)]">
                      <Image
                        src={cover}
                        alt={project.title}
                        fill
                        sizes="(max-width: 640px) 100vw, 50vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                  )}
                  <h2 className="mt-3 font-[family-name:var(--font-space-grotesk)] text-lg font-medium text-[var(--color-ink)] group-hover:text-[var(--color-lime)]">
                    {project.title}
                  </h2>
                  {project.summary && (
                    <p className="mt-1 text-sm text-[var(--color-muted-ink)]">
                      {project.summary}
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
