"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { GripVertical } from "lucide-react";

export interface DashboardProject {
  id: string;
  title: string | null;
  status: string;
  updated_at: string;
  sort_order: number;
}

/**
 * Drag-to-reorder project list. Order here is what /work and the homepage
 * Featured grid use (both query `.order("sort_order")`), so reordering
 * persists sort_order for every affected row on drop.
 */
export function ProjectList({ initialProjects }: { initialProjects: DashboardProject[] }) {
  const [projects, setProjects] = useState(initialProjects);
  const dragFrom = useRef<number | null>(null);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);

  const handleDragStart = (idx: number) => {
    dragFrom.current = idx;
    setDraggingIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragFrom.current === null || dragFrom.current === idx) return;
    const reordered = [...projects];
    const [moved] = reordered.splice(dragFrom.current, 1);
    reordered.splice(idx, 0, moved);
    dragFrom.current = idx;
    setDraggingIdx(idx);
    setProjects(reordered);
  };

  const handleDragEnd = async () => {
    setDraggingIdx(null);
    dragFrom.current = null;

    const withOrder = projects.map((p, i) => ({ ...p, sort_order: i }));
    setProjects(withOrder);

    try {
      const results = await Promise.all(
        withOrder.map((p) =>
          fetch(`/api/projects/${p.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sort_order: p.sort_order }),
          }),
        ),
      );
      if (results.some((r) => !r.ok)) throw new Error("Failed to save order");
      toast.success("Order saved");
    } catch {
      toast.error("Failed to save order");
    }
  };

  if (projects.length === 0) {
    return <p className="text-sm text-[var(--color-muted-ink)]">No projects yet.</p>;
  }

  return (
    <div className="space-y-2">
      {projects.map((project, idx) => (
        <div
          key={project.id}
          draggable
          onDragStart={() => handleDragStart(idx)}
          onDragOver={(e) => handleDragOver(e, idx)}
          onDragEnd={handleDragEnd}
          className={`flex items-center gap-3 rounded-md border border-[var(--color-void-line)] bg-[var(--color-void-2)] px-4 py-3 transition-colors hover:border-[var(--color-muted-ink)] ${
            draggingIdx === idx ? "opacity-50" : ""
          }`}
        >
          <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-[var(--color-muted-ink)]" />
          <Link
            href={`/admin/dashboard/projects/${project.id}`}
            className="flex flex-1 items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">{project.title || "Untitled"}</span>
              <Badge
                variant={project.status === "published" ? "default" : "secondary"}
                className={
                  project.status === "published"
                    ? "bg-[var(--color-lime)] text-[var(--color-void)]"
                    : "border-[var(--color-void-line)] bg-transparent text-[var(--color-muted-ink)]"
                }
              >
                {project.status}
              </Badge>
            </div>
            <span className="text-xs text-[var(--color-muted-ink)]">
              {new Date(project.updated_at).toLocaleDateString()}
            </span>
          </Link>
        </div>
      ))}
    </div>
  );
}
