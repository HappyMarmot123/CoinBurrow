import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const accessToken = request.cookies.get("accessToken")?.value;
  const { pathname } = request.nextUrl;

  if (accessToken && pathname === "/") {
    return NextResponse.redirect(new URL("/market", request.url));
  }

  if (!accessToken && pathname !== "/") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-is-logged-in", !!accessToken ? "true" : "false");

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ["/", "/market/:path*"],
};
