import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-auth";

// GET /api/projects/:id
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*, project_images(*)")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  return NextResponse.json(data);
}

// PATCH /api/projects/:id
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const authError = await requireAdmin();
  if (authError) return authError;

  const supabase = createAdminClient();
  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.title !== undefined) updates.title = body.title;
  if (body.slug !== undefined) updates.slug = body.slug;
  if (body.summary !== undefined) updates.summary = body.summary;
  if (body.client !== undefined) updates.client = body.client;
  if (body.year !== undefined) updates.year = body.year;
  if (body.body_md !== undefined) updates.body_md = body.body_md;
  if (body.tags !== undefined) updates.tags = body.tags;
  if (body.cover_path !== undefined) updates.cover_path = body.cover_path;
  if (body.sort_order !== undefined) updates.sort_order = body.sort_order;

  if (body.status !== undefined) {
    updates.status = body.status;
    if (body.status === "published") {
      const { data: existing } = await supabase
        .from("projects")
        .select("published_at")
        .eq("id", id)
        .single();
      if (!existing?.published_at) {
        updates.published_at = new Date().toISOString();
      }
    }
  }

  const { data, error } = await supabase
    .from("projects")
    .update(updates)
    .eq("id", id)
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

// DELETE /api/projects/:id
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const authError = await requireAdmin();
  if (authError) return authError;

  const supabase = createAdminClient();
  const { data: images } = await supabase
    .from("project_images")
    .select("storage_path")
    .eq("project_id", id);

  if (images && images.length > 0) {
    const paths = images.map((img) => img.storage_path);
    await supabase.storage.from("media").remove(paths);
  }

  const { error } = await supabase.from("projects").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
