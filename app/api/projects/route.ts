import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-auth";

// GET /api/projects — list all projects
export async function GET() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, title, slug, status, summary, cover_path, tags, client, year, body_md, sort_order, created_at, updated_at, published_at")
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

// POST /api/projects — create a new project
export async function POST(request: Request) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const supabase = createAdminClient();
  const body = await request.json();
  const { title, slug, summary, client, year, body_md, tags, cover_path, status, sort_order } = body;

  if (!title || !slug) {
    return NextResponse.json({ error: "Title and slug are required" }, { status: 400 });
  }

  const published_at = status === "published" ? new Date().toISOString() : null;

  const { data, error } = await supabase
    .from("projects")
    .insert({
      title,
      slug,
      summary: summary || null,
      client: client || null,
      year: year || null,
      body_md: body_md || null,
      tags: tags || [],
      cover_path: cover_path || null,
      status: status || "draft",
      sort_order: sort_order || 0,
      published_at,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
