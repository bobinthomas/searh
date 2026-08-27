import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-auth";

// GET /api/posts/:id
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  return NextResponse.json(data);
}

// PATCH /api/posts/:id
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
  if (body.excerpt !== undefined) updates.excerpt = body.excerpt;
  if (body.body_md !== undefined) updates.body_md = body.body_md;
  if (body.tags !== undefined) updates.tags = body.tags;
  if (body.cover_path !== undefined) updates.cover_path = body.cover_path;

  // Handle status change to published — set published_at
  if (body.status !== undefined) {
    updates.status = body.status;
    if (body.status === "published") {
      // Only set published_at if not already set
      const { data: existing } = await supabase
        .from("posts")
        .select("published_at")
        .eq("id", id)
        .single();
      if (!existing?.published_at) {
        updates.published_at = new Date().toISOString();
      }
    }
  }

  const { data, error } = await supabase
    .from("posts")
    .update(updates)
    .eq("id", id)
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

// DELETE /api/posts/:id
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const authError = await requireAdmin();
  if (authError) return authError;

  const supabase = createAdminClient();
  const { error } = await supabase.from("posts").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
