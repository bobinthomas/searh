// Cheap gate: if there is no session cookie at all, go to the sign-in screen.
//
// This only checks that a cookie exists — it cannot verify it, because the D1
// binding is not available here. The (app) layout does the real check, and every
// API route authorises independently.
import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "mt_session";

export function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Protect everything except the sign-in screen, the auth endpoints and
     * static assets. API routes guard themselves, so they are excluded too.
     */
    "/((?!login|api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
