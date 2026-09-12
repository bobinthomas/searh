import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Reveal } from "@/components/anim/Reveal";
import { WorkGrid } from "@/components/work/WorkGrid";

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
        <Reveal y={30} scale={0.96}>
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-medium tracking-tight text-[var(--color-ink)] md:text-5xl">
            Work
          </h1>
        </Reveal>

        {projects.length === 0 ? (
          <p className="mt-4 text-lg text-[var(--color-muted-ink)]">
            Nothing published yet — check back soon.
          </p>
        ) : (
          <WorkGrid projects={projects} />
        )}
      </div>
    </main>
  );
}
