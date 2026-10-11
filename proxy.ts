import { NextResponse, type NextRequest } from "next/server";

// Optimistic check only: send visitors without a session cookie to the admin
// login page. Real authorization happens server-side in every /api/admin
// route handler (lib/auth/guard.ts).
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/admin/login") return NextResponse.next();
  if (!request.cookies.has("ecolearn_session")) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
