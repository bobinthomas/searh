"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { GripVertical, Trash2, Upload } from "lucide-react";

interface GalleryImage {
  id?: string;
  storage_path: string;
  alt: string;
  width: number | null;
  height: number | null;
  sort_order: number;
}

interface GalleryEditorProps {
  projectId: string;
  images: GalleryImage[];
  onUpdate: (images: GalleryImage[]) => void;
}

function processImage(file: File): Promise<{
  blob: Blob;
  width: number;
  height: number;
}> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      let { naturalWidth: w, naturalHeight: h } = img;
      if (w > 2000 || h > 2000) {
        if (w > h) {
          h = Math.round((h / w) * 2000);
          w = 2000;
        } else {
          w = Math.round((w / h) * 2000);
          h = 2000;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("No canvas context")); return; }
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve({ blob, width: w, height: h });
          else reject(new Error("WebP conversion failed"));
        },
        "image/webp",
        0.85,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Load failed")); };
    img.src = url;
  });
}

export function GalleryEditor({
  projectId,
  images,
  onUpdate,
}: GalleryEditorProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      const newImages: GalleryImage[] = [];

      for (const file of files) {
        const { blob, width, height } = await processImage(file);
        const uuid = crypto.randomUUID();
        const slug = file.name.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
        const storagePath = `projects/${slug}/${uuid}.webp`;

        const { error } = await supabase.storage
          .from("media")
          .upload(storagePath, blob, { contentType: "image/webp", upsert: false });

        if (error) throw error;

        newImages.push({
          storage_path: storagePath,
          alt: "",
          width,
          height,
          sort_order: images.length + newImages.length,
        });
      }

      // Save each new image to the database
      for (const img of newImages) {
        const res = await fetch(`/api/projects/${projectId}/images`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storage_path: img.storage_path,
            alt: img.alt,
            width: img.width,
            height: img.height,
            sort_order: img.sort_order,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to save image");
        }

        const saved = await res.json();
        img.id = saved.id;
      }

      onUpdate([...images, ...newImages]);
      toast.success(`Uploaded ${newImages.length} image(s)`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (idx: number) => {
    const img = images[idx];
    if (!img.id) {
      // Not yet saved to DB — just remove from local state
      onUpdate(images.filter((_, i) => i !== idx));
      return;
    }

    try {
      const res = await fetch(`/api/projects/${projectId}/images/${img.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Delete failed");

      // Also delete from storage
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      await supabase.storage.from("media").remove([img.storage_path]);

      onUpdate(images.filter((_, i) => i !== idx));
      toast.success("Image deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const handleAltChange = async (idx: number, alt: string) => {
    const updated = [...images];
    updated[idx] = { ...updated[idx], alt };
    onUpdate(updated);

    // Save to DB if image already has an id
    if (updated[idx].id) {
      try {
        await fetch(`/api/projects/${projectId}/images/${updated[idx].id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ alt }),
        });
      } catch {
        // Silently fail — alt text is not critical to save immediately
      }
    }
  };

  const handleDragStart = (idx: number) => setDragIdx(idx);

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;

    const reordered = [...images];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(idx, 0, moved);

    // Update sort orders
    const withOrder = reordered.map((img, i) => ({ ...img, sort_order: i }));
    setDragIdx(idx);
    onUpdate(withOrder);
  };

  const handleDragEnd = async () => {
    setDragIdx(null);

    // Persist new sort order
    for (const img of images) {
      if (img.id) {
        try {
          await fetch(`/api/projects/${projectId}/images/${img.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sort_order: img.sort_order }),
          });
        } catch {
          // Best effort
        }
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted-ink)]">
          Gallery ({images.length} images)
        </Label>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleUpload}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="border-[var(--color-void-line)] text-[var(--color-paper)]"
          >
            <Upload className="h-4 w-4" />
            {uploading ? "Uploading..." : "Add images"}
          </Button>
        </div>
      </div>

      {images.length === 0 && (
        <p className="text-sm text-[var(--color-muted-ink)]">
          No images yet. Upload some to build the gallery.
        </p>
      )}

      <div className="space-y-3">
        {images.map((img, idx) => {
          const url =
            supabaseUrl &&
            `${supabaseUrl}/storage/v1/object/public/media/${img.storage_path}`;

          return (
            <div
              key={img.id ?? img.storage_path}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              className={`flex gap-3 rounded-md border border-[var(--color-void-line)] bg-[var(--color-void-2)] p-3 ${
                dragIdx === idx ? "opacity-50" : ""
              }`}
            >
              <div className="flex items-center">
                <GripVertical className="h-4 w-4 cursor-grab text-[var(--color-muted-ink)]" />
              </div>

              {url && (
                <img
                  src={url}
                  alt={img.alt || "Gallery image"}
                  className="h-16 w-16 rounded object-cover"
                />
              )}

              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    value={img.alt}
                    onChange={(e) => handleAltChange(idx, e.target.value)}
                    placeholder="Alt text (required for publishing)"
                    className="h-8 border-[var(--color-void-line)] bg-[var(--color-void)] text-[var(--color-paper)] placeholder:text-[var(--color-void-muted)]"
                  />
                  {!img.alt && (
                    <span className="text-xs text-[var(--color-destructive)]">
                      Required
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--color-muted-ink)]">
                  {img.width && img.height ? `${img.width}×${img.height}` : ""}
                  {img.storage_path && ` — ${img.storage_path.split("/").pop()}`}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleDelete(idx)}
                className="self-start p-1 text-[var(--color-muted-ink)] transition-colors hover:text-[var(--color-destructive)]"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
