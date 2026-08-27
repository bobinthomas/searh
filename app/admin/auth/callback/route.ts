import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

// The user clicks the magic link in their email.
// Supabase redirects here with ?code=... in the URL.
// We exchange the code for a session, then redirect to /admin.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/admin/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/admin/login?error=auth`);
}
