import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const auth = cookieStore.get("admin_auth");

  if (!auth || auth.value !== "true") {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-[var(--color-void)] text-[var(--color-paper)]">
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-[var(--color-void-line)] bg-[var(--color-void)]/90 px-6 py-3 backdrop-blur-md">
        <div className="flex items-center gap-6">
          <Link
            href="/admin/dashboard"
            className="font-[family-name:var(--font-space-grotesk)] text-sm font-bold tracking-tight text-[var(--color-paper)]"
          >
            admin
          </Link>
          <nav className="flex items-center gap-4 text-xs font-medium tracking-wide uppercase text-[var(--color-muted-ink)]">
            <Link href="/admin/dashboard" className="transition-colors hover:text-[var(--color-paper)]">
              Dashboard
            </Link>
            <Link href="/admin/dashboard/posts/new" className="transition-colors hover:text-[var(--color-paper)]">
              New Post
            </Link>
            <Link href="/admin/dashboard/projects/new" className="transition-colors hover:text-[var(--color-paper)]">
              New Project
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xs text-[var(--color-muted-ink)] transition-colors hover:text-[var(--color-paper)]">
            View site
          </Link>
          <form action="/api/auth/signout" method="post">
            <button type="submit" className="text-xs text-[var(--color-muted-ink)] transition-colors hover:text-[var(--color-paper)]">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">{children}</main>
    </div>
  );
}
