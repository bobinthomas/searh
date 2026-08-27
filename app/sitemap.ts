import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

const SITE_URL = process.env.SITE_URL || "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/work`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/blog`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  // Dynamic pages from Supabase
  try {
    const [{ data: projects }, { data: posts }] = await Promise.all([
      supabase
        .from("projects")
        .select("slug, updated_at")
        .eq("status", "published"),
      supabase
        .from("posts")
        .select("slug, updated_at")
        .eq("status", "published"),
    ]);

    const projectPages: MetadataRoute.Sitemap = (projects ?? []).map((p) => ({
      url: `${SITE_URL}/work/${p.slug}`,
      lastModified: new Date(p.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

    const postPages: MetadataRoute.Sitemap = (posts ?? []).map((p) => ({
      url: `${SITE_URL}/blog/${p.slug}`,
      lastModified: new Date(p.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

    return [...staticPages, ...projectPages, ...postPages];
  } catch {
    // Supabase not configured — return static pages only
    return staticPages;
  }
}
