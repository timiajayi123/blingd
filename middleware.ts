import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const NOINDEX_PATHS = [
  "/account",
  "/admin",
  "/auth-callback",
  "/cart",
  "/checkout",
  "/custom",
  "/inbox",
  "/orders",
  "/ping",
  "/signin",
  "/signup",
  "/success",
  "/verify",
  "/vouchers",
  "/wishlist",
];

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isCrawlerFile = pathname === "/sitemap.xml" || pathname === "/robots.txt";

  if (request.nextUrl.hostname === "www.blingd.ng" && !isCrawlerFile) {
    const canonicalUrl = request.nextUrl.clone();
    canonicalUrl.hostname = "blingd.ng";
    return NextResponse.redirect(canonicalUrl, 308);
  }

  if (pathname === "/storefront") {
    const storeUrl = request.nextUrl.clone();
    storeUrl.pathname = "/store";
    return NextResponse.redirect(storeUrl, 308);
  }

  const response = NextResponse.next();

  if (NOINDEX_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
