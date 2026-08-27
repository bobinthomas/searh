import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-auth";

// GET /api/projects/:id/images
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("project_images")
    .select("*")
    .eq("project_id", id)
    .order("sort_order");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

// POST /api/projects/:id/images
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const authError = await requireAdmin();
  if (authError) return authError;

  const supabase = createAdminClient();
  const body = await request.json();
  const { storage_path, alt, caption, width, height, sort_order } = body;

  if (!storage_path) {
    return NextResponse.json({ error: "storage_path is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("project_images")
    .insert({
      project_id: id,
      storage_path,
      alt: alt || null,
      caption: caption || null,
      width: width || null,
      height: height || null,
      sort_order: sort_order ?? 0,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
