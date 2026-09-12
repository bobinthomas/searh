import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Reveal } from "@/components/anim/Reveal";
import { BlogList } from "@/components/work/BlogList";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Notes on drawing, illustration practice, and applications by serahbobin.",
};

async function getPosts() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("posts")
      .select("id, slug, title, excerpt, published_at")
      .eq("status", "published")
      .order("published_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch posts:", error.message);
      return [];
    }
    return data ?? [];
  } catch {
    return [];
  }
}

export default async function BlogPage() {
  const posts = await getPosts();

  return (
    <main className="min-h-screen bg-[var(--color-paper)] px-6 py-24">
      <div className="mx-auto max-w-4xl">
        <Reveal y={30} scale={0.96}>
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-medium tracking-tight text-[var(--color-ink)] md:text-5xl">
            Blog
          </h1>
        </Reveal>

        {posts.length === 0 ? (
          <p className="mt-4 text-lg text-[var(--color-muted-ink)]">
            No posts published yet — check back soon.
          </p>
        ) : (
          <BlogList posts={posts} />
        )}
      </div>
    </main>
  );
}
