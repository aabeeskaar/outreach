import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  // Public routes
  const publicRoutes = ["/", "/login", "/signup"];
  const isPublicRoute =
    publicRoutes.includes(pathname) ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/track/") ||  // Email tracking endpoints (open/click)
    pathname.startsWith("/api/stripe/webhook") ||  // Stripe webhooks
    pathname.startsWith("/api/analytics/track");  // Analytics tracking

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Protected routes - redirect to login if not authenticated
  if (!isLoggedIn) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};
