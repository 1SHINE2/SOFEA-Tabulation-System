// middleware.ts — Route Guards
import { NextRequest, NextResponse } from "next/server";

// Protect judge and admin routes
export function middleware(request: NextRequest) {
  // Middleware can't read localStorage (client-only),
  // so actual session checks are done client-side in each page.
  // This file is a placeholder for future server-side auth if needed.
  return NextResponse.next();
}

export const config = {
  matcher: ["/judge/:path*", "/admin/:path*"],
};
