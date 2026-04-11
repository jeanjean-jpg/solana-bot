import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/pin")) return NextResponse.next();

  const pinVerified = request.cookies.get("solbot_pin_verified");
  if (!pinVerified) {
    return NextResponse.redirect(new URL("/pin", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
