"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface ImageUploadProps {
  currentPath: string | null;
  mediaFolder: "posts" | "projects";
  onUpload: (path: string) => void;
  onRemove: () => void;
}

const MAX_DIMENSION = 2000;
const WEBP_QUALITY = 0.85;

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

      // Resize if larger than MAX_DIMENSION
      if (w > MAX_DIMENSION || h > MAX_DIMENSION) {
        if (w > h) {
          h = Math.round((h / w) * MAX_DIMENSION);
          w = MAX_DIMENSION;
        } else {
          w = Math.round((w / h) * MAX_DIMENSION);
          h = MAX_DIMENSION;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      ctx.drawImage(img, 0, 0, w, h);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve({ blob, width: w, height: h });
          } else {
            reject(new Error("Failed to convert to WebP"));
          }
        },
        "image/webp",
        WEBP_QUALITY,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}

export function ImageUpload({
  currentPath,
  mediaFolder,
  onUpload,
  onRemove,
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const currentUrl = currentPath && supabaseUrl
    ? `${supabaseUrl}/storage/v1/object/public/media/${currentPath}`
    : null;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Process in browser: resize + WebP
      const { blob, width, height } = await processImage(file);

      // Generate storage path: media/{folder}/{slug}/{uuid}.webp
      const uuid = crypto.randomUUID();
      const slug = file.name.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const storagePath = `${mediaFolder}/${slug}/${uuid}.webp`;

      // Upload to Supabase Storage via client
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      const { error } = await supabase.storage
        .from("media")
        .upload(storagePath, blob, {
          contentType: "image/webp",
          upsert: false,
        });

      if (error) throw error;

      // Show preview
      setPreview(URL.createObjectURL(blob));
      onUpload(storagePath);

      toast.success(`Uploaded (${width}×${height} WebP)`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemove = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    onRemove();
  };

  const displayUrl = preview || currentUrl;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleUpload}
          disabled={uploading}
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
          {uploading ? "Processing..." : "Choose image"}
        </Button>
        {displayUrl && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            className="text-[var(--color-destructive)]"
          >
            Remove
          </Button>
        )}
      </div>

      {displayUrl && (
        <div className="relative overflow-hidden rounded-md border border-[var(--color-void-line)]">
          <img
            src={displayUrl}
            alt="Cover preview"
            className="h-40 w-full object-cover"
          />
        </div>
      )}

      {currentPath && (
        <p className="text-xs text-[var(--color-muted-ink)] break-all">
          {currentPath}
        </p>
      )}
    </div>
  );
}
