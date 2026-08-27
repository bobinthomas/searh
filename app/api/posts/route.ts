import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/posts — list all posts (admin sees all, not just published)
export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select("id, title, slug, status, excerpt, cover_path, tags, body_md, created_at, updated_at, published_at")
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

// POST /api/posts — create a new post
export async function POST(request: Request) {
  const supabase = await createClient();

  // Verify auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { title, slug, excerpt, body_md, tags, cover_path, status } = body;

  if (!title || !slug) {
    return NextResponse.json({ error: "Title and slug are required" }, { status: 400 });
  }

  const published_at = status === "published" ? new Date().toISOString() : null;

  const { data, error } = await supabase
    .from("posts")
    .insert({
      title,
      slug,
      excerpt: excerpt || null,
      body_md: body_md || null,
      tags: tags || [],
      cover_path: cover_path || null,
      status: status || "draft",
      published_at,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
