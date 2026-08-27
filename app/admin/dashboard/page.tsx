import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function AdminDashboard() {
  const supabase = createAdminClient();

  const [{ data: posts }, { data: projects }] = await Promise.all([
    supabase
      .from("posts")
      .select("id, title, slug, status, updated_at, published_at")
      .order("updated_at", { ascending: false }),
    supabase
      .from("projects")
      .select("id, title, slug, status, updated_at, published_at")
      .order("updated_at", { ascending: false }),
  ]);

  return (
    <div className="space-y-10">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h1 className="font-[family-name:var(--font-space-grotesk)] text-xl font-bold">
            Posts
          </h1>
          <Button
            asChild
            size="sm"
            className="bg-[var(--color-lime)] text-[var(--color-void)] hover:bg-[var(--color-lime)]/90"
          >
            <Link href="/admin/dashboard/posts/new">New post</Link>
          </Button>
        </div>

        {posts && posts.length > 0 ? (
          <div className="space-y-2">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/admin/dashboard/posts/${post.id}`}
                className="flex items-center justify-between rounded-md border border-[var(--color-void-line)] bg-[var(--color-void-2)] px-4 py-3 transition-colors hover:border-[var(--color-muted-ink)]"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">{post.title || "Untitled"}</span>
                  <Badge
                    variant={post.status === "published" ? "default" : "secondary"}
                    className={
                      post.status === "published"
                        ? "bg-[var(--color-lime)] text-[var(--color-void)]"
                        : "border-[var(--color-void-line)] bg-transparent text-[var(--color-muted-ink)]"
                    }
                  >
                    {post.status}
                  </Badge>
                </div>
                <span className="text-xs text-[var(--color-muted-ink)]">
                  {new Date(post.updated_at).toLocaleDateString()}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--color-muted-ink)]">No posts yet.</p>
        )}
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h1 className="font-[family-name:var(--font-space-grotesk)] text-xl font-bold">
            Projects
          </h1>
          <Button
            asChild
            size="sm"
            className="bg-[var(--color-lime)] text-[var(--color-void)] hover:bg-[var(--color-lime)]/90"
          >
            <Link href="/admin/dashboard/projects/new">New project</Link>
          </Button>
        </div>

        {projects && projects.length > 0 ? (
          <div className="space-y-2">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/admin/dashboard/projects/${project.id}`}
                className="flex items-center justify-between rounded-md border border-[var(--color-void-line)] bg-[var(--color-void-2)] px-4 py-3 transition-colors hover:border-[var(--color-muted-ink)]"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">
                    {project.title || "Untitled"}
                  </span>
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
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--color-muted-ink)]">
            No projects yet.
          </p>
        )}
      </div>
    </div>
  );
}
