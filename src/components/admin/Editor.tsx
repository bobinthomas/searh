"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownPreview } from "@/components/admin/MarkdownPreview";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { TagInput } from "@/components/admin/TagInput";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export interface EditorData {
  id?: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  summary?: string | null;
  body_md: string;
  tags: string[];
  cover_path: string | null;
  status: "draft" | "published";
}

interface EditorProps {
  type: "post" | "project";
  initialData?: EditorData;
  isNew: boolean;
}

export function Editor({ type, initialData, isNew }: EditorProps) {
  const router = useRouter();
  const [data, setData] = useState<EditorData>(
    initialData ?? {
      title: "",
      slug: "",
      excerpt: "",
      summary: "",
      body_md: "",
      tags: [],
      cover_path: null,
      status: "draft",
    },
  );
  const [saving, setSaving] = useState(false);
  const [slugLocked, setSlugLocked] = useState(false);
  const [dirty, setDirty] = useState(false);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(false);

  // Lock slug once published
  useEffect(() => {
    if (initialData?.status === "published") {
      setSlugLocked(true);
    }
  }, [initialData?.status]);

  // Track dirty state
  useEffect(() => {
    if (mountedRef.current) {
      setDirty(true);
    }
    mountedRef.current = true;
  }, [data]);

  // Autosave drafts every 30 seconds
  useEffect(() => {
    if (data.status !== "draft" || !dirty || isNew) return;
    autosaveTimer.current = setTimeout(() => {
      handleSave(true); // silent save
    }, 30000);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [data, dirty, isNew]);

  // Warn on navigate away with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // Auto-generate slug from title (only when new and not locked)
  const handleTitleChange = useCallback(
    (title: string) => {
      setData((prev) => ({
        ...prev,
        title,
        slug: slugLocked ? prev.slug : slugify(title),
      }));
    },
    [slugLocked],
  );

  const handleSave = useCallback(
    async (silent = false) => {
      if (!data.title.trim()) {
        if (!silent) toast.error("Title is required");
        return;
      }

      setSaving(true);
      try {
        const url = data.id
          ? `/api/${type}s/${data.id}`
          : `/api/${type}s`;
        const method = data.id ? "PATCH" : "POST";

        const body = {
          title: data.title,
          slug: data.slug || slugify(data.title),
          ...(type === "post"
            ? { excerpt: data.excerpt }
            : { summary: data.summary }),
          body_md: data.body_md,
          tags: data.tags,
          cover_path: data.cover_path,
          status: data.status,
        };

        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Save failed");
        }

        const result = await res.json();

        if (isNew && result.id) {
          // Redirect to edit URL for newly created items              router.replace(`/admin/dashboard/${type}s/${result.id}`);
        } else {
          setData((prev) => ({ ...prev, id: result.id ?? prev.id }));
        }

        setDirty(false);
        if (!silent) toast.success("Saved");
      } catch (err) {
        if (!silent) toast.error(err instanceof Error ? err.message : "Save failed");
      } finally {
        setSaving(false);
      }
    },
    [data, type, isNew, router],
  );

  const handlePublish = useCallback(async () => {
    // Validate alt text on cover image before publish
    setData((prev) => ({ ...prev, status: "published" }));
    // Wait for state update, then save
    setTimeout(() => {
      setData((prev) => {
        const updated = { ...prev, status: "published" as const };
        // Save with published status
        (async () => {
          setSaving(true);
          try {
            const url = updated.id
              ? `/api/${type}s/${updated.id}`
              : `/api/${type}s`;
            const method = updated.id ? "PATCH" : "POST";

            const body = {
              title: updated.title,
              slug: updated.slug || slugify(updated.title),
              ...(type === "post"
                ? { excerpt: updated.excerpt }
                : { summary: updated.summary }),
              body_md: updated.body_md,
              tags: updated.tags,
              cover_path: updated.cover_path,
              status: "published" as const,
            };

            const res = await fetch(url, {
              method,
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            });

            if (!res.ok) {
              const err = await res.json();
              throw new Error(err.error || "Publish failed");
            }

            const result = await res.json();
            setSlugLocked(true);
            setDirty(false);
            if (isNew && result.id) {
              router.replace(`/admin/dashboard/${type}s/${result.id}`);
            }
            toast.success("Published");
          } catch (err) {
            setData((prev) => ({ ...prev, status: "draft" }));
            toast.error(err instanceof Error ? err.message : "Publish failed");
          } finally {
            setSaving(false);
          }
        })();
        return updated;
      });
    }, 0);
  }, [type, isNew, router]);

  const labelClass = "text-[var(--color-muted-ink)] text-xs font-medium uppercase tracking-wide";
  const inputClass =
    "border-[var(--color-void-line)] bg-[var(--color-void-2)] text-[var(--color-paper)] placeholder:text-[var(--color-void-muted)]";

  return (
    <div className="space-y-6">
      {/* Top bar with save/publish */}
      <div className="flex items-center justify-between">
        <h1 className="font-[family-name:var(--font-space-grotesk)] text-lg font-bold">
          {isNew ? `New ${type}` : `Edit ${type}`}
        </h1>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={saving}
            onClick={() => handleSave()}
            className="border-[var(--color-void-line)] text-[var(--color-paper)]"
          >
            {saving ? "Saving..." : "Save draft"}
          </Button>
          <Button
            size="sm"
            disabled={saving || data.status === "published"}
            onClick={handlePublish}
            className="bg-[var(--color-lime)] text-[var(--color-void)] hover:bg-[var(--color-lime)]/90"
          >
            Publish
          </Button>
        </div>
      </div>

      {/* Fields */}
      <div className="grid gap-6 md:grid-cols-[1fr_1fr]">
        {/* Left column — form fields */}
        <div className="space-y-5">
          {/* Title */}
          <div className="space-y-2">
            <Label className={labelClass}>Title</Label>
            <Input
              value={data.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Post title"
              className={inputClass}
            />
          </div>

          {/* Slug */}
          <div className="space-y-2">
            <Label className={labelClass}>Slug</Label>
            <Input
              value={data.slug}
              onChange={(e) =>
                !slugLocked && setData((prev) => ({ ...prev, slug: e.target.value }))
              }
              placeholder="post-slug"
              disabled={slugLocked}
              className={inputClass}
            />
            {slugLocked && (
              <p className="text-xs text-[var(--color-muted-ink)]">
                Slug is locked (item is published).
              </p>
            )}
          </div>

          {/* Excerpt or Summary */}
          <div className="space-y-2">
            <Label className={labelClass}>
              {type === "post" ? "Excerpt" : "Summary"}
            </Label>
            <Textarea
              value={type === "post" ? data.excerpt ?? "" : data.summary ?? ""}
              onChange={(e) =>
                setData((prev) => ({
                  ...prev,
                  ...(type === "post"
                    ? { excerpt: e.target.value }
                    : { summary: e.target.value }),
                }))
              }
              placeholder="Brief description..."
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label className={labelClass}>Tags</Label>
            <TagInput
              value={data.tags}
              onChange={(tags) => setData((prev) => ({ ...prev, tags }))}
            />
          </div>

          {/* Cover image */}
          <div className="space-y-2">
            <Label className={labelClass}>Cover image</Label>
            <ImageUpload
              currentPath={data.cover_path}
              mediaFolder={type === "post" ? "posts" : "projects"}
              onUpload={(path) =>
                setData((prev) => ({ ...prev, cover_path: path }))
              }
              onRemove={() =>
                setData((prev) => ({ ...prev, cover_path: null }))
              }
            />
          </div>

          {/* Status */}
          <div className="flex items-center gap-3">
            <Switch
              checked={data.status === "published"}
              onCheckedChange={(checked) =>
                setData((prev) => ({
                  ...prev,
                  status: checked ? "published" : "draft",
                }))
              }
            />
            <Label className="text-sm text-[var(--color-paper)]">
              {data.status === "published" ? "Published" : "Draft"}
            </Label>
          </div>
        </div>

        {/* Right column — markdown editor + preview */}
        <div className="space-y-2">
          <Label className={labelClass}>Body (Markdown)</Label>
          <div className="grid h-[500px] gap-2 md:grid-cols-2">
            <Textarea
              value={data.body_md}
              onChange={(e) =>
                setData((prev) => ({ ...prev, body_md: e.target.value }))
              }
              placeholder="Write your content in Markdown..."
              className={`${inputClass} h-full resize-none font-mono text-xs`}
            />
            <div className="h-full overflow-auto rounded-md border border-[var(--color-void-line)] bg-[var(--color-void-2)] p-4">
              <MarkdownPreview content={data.body_md} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
