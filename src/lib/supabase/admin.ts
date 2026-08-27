import "server-only";

import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      `Missing Supabase admin env vars: ${
        !url ? "NEXT_PUBLIC_SUPABASE_URL" : ""
      } ${!key ? "SUPABASE_SERVICE_ROLE_KEY" : ""}`.trim(),
    );
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
