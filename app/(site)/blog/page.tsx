import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

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
        <h1 className="font-[family-name:var(--font-space-grotesk)] text-4xl font-medium tracking-tight text-[var(--color-ink)] md:text-5xl">
          Blog
        </h1>

        {posts.length === 0 ? (
          <p className="mt-4 text-lg text-[var(--color-muted-ink)]">
            No posts published yet — check back soon.
          </p>
        ) : (
          <div className="mt-12 space-y-8">
            {posts.map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`} className="group block">
                <h2 className="font-[family-name:var(--font-space-grotesk)] text-xl font-medium text-[var(--color-ink)] group-hover:text-[var(--color-lime)]">
                  {post.title}
                </h2>
                {post.excerpt && (
                  <p className="mt-1 text-[var(--color-muted-ink)]">{post.excerpt}</p>
                )}
                {post.published_at && (
                  <time
                    dateTime={post.published_at}
                    className="mt-2 block text-sm text-[var(--color-muted-ink)]"
                  >
                    {new Date(post.published_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </time>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
