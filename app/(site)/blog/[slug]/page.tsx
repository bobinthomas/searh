import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { mediaUrl } from "@/lib/images";
import { Reveal } from "@/components/anim/Reveal";

export const revalidate = 3600;

const SITE_URL = process.env.SITE_URL || "http://localhost:3000";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("posts")
    .select("title, excerpt, cover_path")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (!data) return { title: "Post not found" };

  const ogImage = `${SITE_URL}/api/og?title=${encodeURIComponent(data.title)}&subtitle=${encodeURIComponent(data.excerpt || "blog post")}`;
  const coverImage = data.cover_path ? mediaUrl(data.cover_path) : undefined;

  return {
    title: data.title,
    description: data.excerpt || undefined,
    openGraph: {
      title: data.title,
      description: data.excerpt || undefined,
      type: "article",
      url: `${SITE_URL}/blog/${slug}`,
      images: coverImage ? [{ url: coverImage, width: 1200, height: 630 }] : [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: data.title,
      description: data.excerpt || undefined,
      images: coverImage ? [coverImage] : [ogImage],
    },
  };
}

export default async function BlogSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: post } = await supabase
    .from("posts")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (!post) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.published_at,
    dateModified: post.updated_at,
    author: {
      "@type": "Person",
      name: "serahbobin",
    },
    image: post.cover_path ? mediaUrl(post.cover_path) : undefined,
    url: `${SITE_URL}/blog/${slug}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="min-h-screen bg-[var(--color-paper)] px-6 py-24">
        <article className="mx-auto max-w-3xl">
          <Reveal y={30} scale={0.97}>
            <header className="mb-12">
              <h1 className="font-[family-name:var(--font-display)] text-4xl font-medium tracking-tight text-[var(--color-ink)] md:text-5xl">
                {post.title}
              </h1>
              {post.excerpt && (
                <p className="mt-4 text-lg text-[var(--color-muted-ink)]">
                  {post.excerpt}
                </p>
              )}
              <div className="mt-4 flex items-center gap-4 text-sm text-[var(--color-muted-ink)]">
                <time dateTime={post.published_at}>
                  {new Date(post.published_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </time>
                <div className="flex gap-2">
                  {post.tags?.map((tag: string) => (
                    <span
                      key={tag}
                      className="rounded-full bg-[var(--color-void)] px-3 py-1 text-xs text-[var(--color-paper)]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </header>
          </Reveal>

          {post.cover_path && (
            <Reveal y={50} scale={0.9} delay={0.1}>
              <img
                src={mediaUrl(post.cover_path)}
                alt={post.title}
                className="mb-12 w-full rounded object-cover"
              />
            </Reveal>
          )}

          {post.body_md && (
            <div className="prose max-w-none text-[var(--color-ink)]">
              {post.body_md}
            </div>
          )}
        </article>
      </main>
    </>
  );
}
