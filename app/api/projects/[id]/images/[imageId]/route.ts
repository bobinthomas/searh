import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-auth";

// PATCH /api/projects/:id/images/:imageId
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; imageId: string }> },
) {
  const { imageId } = await params;
  const authError = await requireAdmin();
  if (authError) return authError;

  const supabase = createAdminClient();
  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.alt !== undefined) updates.alt = body.alt;
  if (body.caption !== undefined) updates.caption = body.caption;
  if (body.sort_order !== undefined) updates.sort_order = body.sort_order;

  const { data, error } = await supabase
    .from("project_images")
    .update(updates)
    .eq("id", imageId)
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

// DELETE /api/projects/:id/images/:imageId
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; imageId: string }> },
) {
  const { imageId } = await params;
  const authError = await requireAdmin();
  if (authError) return authError;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("project_images")
    .delete()
    .eq("id", imageId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
