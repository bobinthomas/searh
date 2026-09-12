import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
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
    .from("projects")
    .select("title, summary, cover_path")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (!data) return { title: "Project not found" };

  const ogImage = `${SITE_URL}/api/og?title=${encodeURIComponent(data.title)}&subtitle=${encodeURIComponent(data.summary || "project")}`;
  const coverImage = data.cover_path ? mediaUrl(data.cover_path) : undefined;

  return {
    title: data.title,
    description: data.summary || undefined,
    openGraph: {
      title: data.title,
      description: data.summary || undefined,
      type: "article",
      url: `${SITE_URL}/work/${slug}`,
      images: coverImage ? [{ url: coverImage, width: 1200, height: 630 }] : [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: data.title,
      description: data.summary || undefined,
      images: coverImage ? [coverImage] : [ogImage],
    },
  };
}

export default async function WorkSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("*, project_images(*)")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (!project) notFound();

  const images = (project.project_images ?? []).sort(
    (a: { sort_order: number }, b: { sort_order: number }) =>
      a.sort_order - b.sort_order,
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: project.title,
    description: project.summary,
    datePublished: project.published_at,
    dateModified: project.updated_at,
    author: {
      "@type": "Person",
      name: "serahbobin",
    },
    image: project.cover_path ? mediaUrl(project.cover_path) : undefined,
    url: `${SITE_URL}/work/${slug}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="min-h-screen bg-[var(--color-paper)] px-6 py-24">
        <article className="mx-auto max-w-4xl">
          <Link
            href="/work"
            className="mb-8 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-muted-ink)] transition-colors hover:text-[var(--color-ink)]"
          >
            ← Work
          </Link>

          <Reveal y={30} scale={0.97}>
            <header className="mb-12">
              <h1 className="font-[family-name:var(--font-display)] text-4xl font-medium tracking-tight text-[var(--color-ink)] md:text-5xl">
                {project.title}
              </h1>
              {project.summary && (
                <p className="mt-4 text-lg text-[var(--color-muted-ink)]">
                  {project.summary}
                </p>
              )}
              <div className="mt-4 flex gap-2">
                {project.tags?.map((tag: string) => (
                  <span
                    key={tag}
                    className="rounded-full bg-[var(--color-ink)] px-3 py-1 text-xs text-[var(--color-paper)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </header>
          </Reveal>

          {project.cover_path && (
            <Reveal y={50} scale={0.9} delay={0.1}>
              <img
                src={mediaUrl(project.cover_path)}
                alt={project.title}
                className="mb-12 w-full rounded object-cover"
              />
            </Reveal>
          )}

          {project.body_md && (
            <div className="prose max-w-none text-[var(--color-ink)]">
              {project.body_md}
            </div>
          )}

          {images.length > 0 && (
            <div className="mt-12 space-y-6">
              {images.map(
                (img: {
                  id: string;
                  storage_path: string;
                  alt: string | null;
                  width: number | null;
                  height: number | null;
                }) => (
                  <Reveal key={img.id} y={50} scale={0.92}>
                    {img.width && img.height ? (
                      <Image
                        src={mediaUrl(img.storage_path)}
                        alt={img.alt || project.title}
                        width={img.width}
                        height={img.height}
                        sizes="(max-width: 768px) 100vw, 768px"
                        style={{ width: "100%", height: "auto" }}
                        className="rounded object-cover"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={mediaUrl(img.storage_path)}
                        alt={img.alt || project.title}
                        className="w-full rounded object-cover"
                      />
                    )}
                  </Reveal>
                ),
              )}
            </div>
          )}
        </article>
      </main>
    </>
  );
}
