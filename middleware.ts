import { NextRequest, NextResponse } from "next/server";

const isApiRoute = (pathname: string) => pathname.startsWith("/api/");

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

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/sonar/:path*",
    "/api/me",
    "/api/ratings/:path*",
    "/api/spotify/:path*",
  ],
};
