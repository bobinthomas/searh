"use client";

import { useState, useEffect } from "react";
import { notFound, useParams } from "next/navigation";
import { Editor } from "@/components/admin/Editor";
import { GalleryEditor } from "@/components/admin/GalleryEditor";
import { Skeleton } from "@/components/ui/skeleton";

interface ProjectImage {
  id?: string;
  storage_path: string;
  alt: string;
  width: number | null;
  height: number | null;
  sort_order: number;
}

export default function EditProjectPage() {
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<{
    id: string;
    title: string;
    slug: string;
    summary: string | null;
    client: string | null;
    year: number | null;
    body_md: string;
    tags: string[];
    cover_path: string | null;
    status: "draft" | "published";
  } | null>(null);
  const [images, setImages] = useState<ProjectImage[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/projects/${id}`);
        if (!res.ok) {
          setError(true);
          return;
        }
        const data = await res.json();
        setProject({
          id: data.id,
          title: data.title,
          slug: data.slug,
          summary: data.summary,
          client: data.client,
          year: data.year,
          body_md: data.body_md ?? "",
          tags: data.tags ?? [],
          cover_path: data.cover_path,
          status: data.status,
        });
        setImages(
          (data.project_images ?? [])
            .sort((a: ProjectImage, b: ProjectImage) => a.sort_order - b.sort_order)
            .map((img: ProjectImage) => ({
              id: img.id,
              storage_path: img.storage_path,
              alt: img.alt ?? "",
              width: img.width,
              height: img.height,
              sort_order: img.sort_order,
            })),
        );
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  if (error || !project) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <Editor type="project" isNew={false} initialData={project} />

      {/* Gallery section — only visible when editing an existing project */}
      <div className="rounded-md border border-[var(--color-void-line)] bg-[var(--color-void-2)] p-6">
        <GalleryEditor
          projectId={id}
          images={images}
          onUpdate={setImages}
        />
      </div>
    </div>
  );
}
