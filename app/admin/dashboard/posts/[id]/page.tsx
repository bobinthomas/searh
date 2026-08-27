import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { Editor } from "@/components/admin/Editor";

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    notFound();
  }

  return (
    <Editor
      type="post"
      isNew={false}
      initialData={{
        id: data.id,
        title: data.title,
        slug: data.slug,
        excerpt: data.excerpt ?? undefined,
        body_md: data.body_md ?? "",
        tags: data.tags ?? [],
        cover_path: data.cover_path,
        status: data.status,
      }}
    />
  );
}
