// Access the Cloudflare D1 binding from server code.
//
// This works in both environments:
//   - `next dev`  → bindings come from wrangler.toml via initOpenNextCloudflareForDev()
//   - Cloudflare Workers (preview/production) → native bindings
//
// Only import this from server code (route handlers, server components).

import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { D1Client } from "./db";

export async function getDb(): Promise<D1Client> {
  const { env } = await getCloudflareContext({ async: true });
  const db = (env as unknown as { DB?: D1Client }).DB;

  if (!db) {
    throw new Error(
      'D1 binding "DB" was not found. Check the [[d1_databases]] entry in wrangler.toml.',
    );
  }

  return db;
}
