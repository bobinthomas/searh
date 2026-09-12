import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import PortfolioShell, {
  type PortfolioWork,
} from "@/components/portfolio/PortfolioShell";
import { HomeHero } from "@/components/portfolio/HomeHero";

export const revalidate = 3600;

const SITE_URL = process.env.SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  openGraph: {
    title: "serahbobin — drawing portfolio",
    description:
      "Sketchbook pages, still life, colour studies and illustration by serahbobin.",
    type: "website",
    url: SITE_URL,
    images: [{ url: `${SITE_URL}/api/og?title=serahbobin&subtitle=drawing+portfolio`, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "serahbobin — drawing portfolio",
    description:
      "Sketchbook pages, still life, colour studies and illustration by serahbobin.",
    images: [`${SITE_URL}/api/og?title=serahbobin&subtitle=drawing+portfolio`],
  },
};

function parseBodyMd(bodyMd: string | null): {
  medium: string;
  time: string;
  note: string;
  alt: string;
} {
  if (!bodyMd) return { medium: "", time: "", note: "", alt: "" };
  try {
    const parsed = JSON.parse(bodyMd) as Record<string, string>;
    return {
      medium: parsed.medium ?? "",
      time: parsed.time ?? "",
      note: parsed.note ?? "",
      alt: parsed.alt ?? "",
    };
  } catch {
    return { medium: "", time: "", note: bodyMd, alt: "" };
  }
}

async function getPortfolioData(): Promise<{
  featured: PortfolioWork[];
  selected: PortfolioWork[];
}> {
  try {
    const supabase = await createClient();

    const { data: projects, error } = await supabase
      .from("projects")
      .select("*")
      .eq("status", "published")
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Failed to fetch projects:", error.message);
      return { featured: [], selected: [] };
    }

    const featured: PortfolioWork[] = [];
    const selected: PortfolioWork[] = [];

    for (const p of projects ?? []) {
      const body = parseBodyMd(p.body_md);
      const work: PortfolioWork = {
        id: p.id,
        slug: p.slug,
        title: p.title,
        cover_path: p.cover_path,
        alt: body.alt || p.title,
        medium: body.medium,
        time: body.time,
        note: body.note || p.summary || "",
        published_at: p.published_at,
      };

      // Every published project shows on the homepage by default; tag
      // "hide-from-home" to keep one off (it still shows on /work).
      if (!p.tags.includes("hide-from-home")) featured.push(work);
      if (p.tags.includes("selected")) selected.push(work);
    }

    return { featured, selected };
  } catch {
    // Supabase not configured or unreachable — render empty
    return { featured: [], selected: [] };
  }
}

export default async function HomePage() {
  const { featured, selected } = await getPortfolioData();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "serahbobin",
    jobTitle: "Illustrator",
    url: SITE_URL,
    sameAs: [
      "https://www.instagram.com/serahbobin",
    ],
    knowsAbout: ["Illustration", "Sketchbook", "Drawing"],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomeHero />
      <PortfolioShell featured={featured} selected={selected} />
    </>
  );
}
