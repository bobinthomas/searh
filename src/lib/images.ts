/**
 * Build a public URL for a file in the Supabase `media` bucket.
 *
 * Returns empty string when the env var is missing (local dev without a
 * connected project) so the UI can render gracefully without broken images.
 */
export function mediaUrl(path: string | null | undefined): string {
  if (!path) return "";
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return "";
  return `${base}/storage/v1/object/public/media/${path}`;
}
