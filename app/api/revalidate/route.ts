import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

export async function POST(request: NextRequest) {
  // Verify shared secret from header
  const secret = request.headers.get("x-revalidation-secret");
  if (secret !== process.env.REVALIDATION_SECRET) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  const body = await request.json();
  const { type, slug } = body as {
    type?: "post" | "project";
    slug?: string;
  };

  // Revalidate the specific page
  if (type && slug) {
    revalidatePath(`/${type === "post" ? "blog" : "work"}/${slug}`);
  }

  // Always revalidate index pages
  revalidatePath("/blog");
  revalidatePath("/work");
  revalidatePath("/");
  revalidatePath("/sitemap.xml");

  // Also revalidate by tag for any tag-based caches
  revalidateTag("content");

  return NextResponse.json({
    revalidated: true,
    type,
    slug,
    timestamp: Date.now(),
  });
}
