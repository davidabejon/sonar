import { NextRequest, NextResponse } from "next/server";

const isApiRoute = (pathname: string) => pathname.startsWith("/api/");
const isSpotifyApi = (pathname: string) => pathname.startsWith("/api/spotify");

export function middleware(request: NextRequest) {
  const session = request.cookies.get("session")?.value;

  if (!session) {
    if (isApiRoute(request.nextUrl.pathname)) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // For non-Spotify API routes, add no-cache headers to prevent disk caching
  const response = NextResponse.next();
  
  if (isApiRoute(request.nextUrl.pathname) && !isSpotifyApi(request.nextUrl.pathname)) {
    response.headers.set("Cache-Control", "no-store, must-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
  }

  return response;
}

export const config = {
  matcher: [
    "/sonar/:path*",
    "/api/me",
    "/api/ratings/:path*",
    "/api/spotify/:path*",
  ],
};
