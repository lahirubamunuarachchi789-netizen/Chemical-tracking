import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { isValidSessionToken } from "@/lib/auth/edge-session";

/**
 * Route protection for the dashboard.
 *
 * The cookie is a signed JWT, so the Middleware verifies the signature and
 * expiry (jose works on the Edge Runtime). Only a genuinely valid session is
 * allowed through; anything else is treated as "not signed in".
 *
 * A stale, expired or tampered cookie is always cleared on the way out. That
 * matters: without clearing it, `/login` would bounce to `/dashboard`, the
 * dashboard would reject the invalid token and bounce back to `/login` - an
 * endless redirect loop that locks the user out of the app entirely.
 */
export async function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isAuthenticated = await isValidSessionToken(token);
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/dashboard") && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    const response = NextResponse.redirect(loginUrl);

    // Drop the unusable cookie so the next request starts clean.
    if (token) {
      response.cookies.delete(SESSION_COOKIE_NAME);
    }

    return response;
  }

  if (pathname === "/login" && isAuthenticated) {
    const dashboardUrl = new URL("/dashboard", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
