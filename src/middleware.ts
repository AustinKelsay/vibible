/**
 * Next.js middleware for CORS handling with strict origin validation.
 * Validates request origins against a server-side allowlist and handles preflight OPTIONS requests.
 * Only sets Access-Control-Allow-Credentials when the origin is explicitly validated and allowed.
 */

import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side allowlist of permitted origins for CORS requests.
 * Origins must match exactly (including protocol and port).
 * Do not directly echo NEXT_PUBLIC_APP_URL without validation.
 */
const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL || "https://visibible.com",
  "https://visibible.com",
  "http://localhost:3000",
  "http://localhost:3001",
].filter(Boolean) as string[];

/**
 * Validates if the request origin is in the allowed origins list.
 * Performs strict string comparison - no wildcards or pattern matching.
 */
function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin);
}

/**
 * Creates CORS headers for validated origins.
 * Only includes Access-Control-Allow-Credentials when origin is explicitly allowed.
 */
function getCorsHeaders(origin: string | null): Record<string, string> {
  const isAllowed = isOriginAllowed(origin);
  
  if (!isAllowed || !origin) {
    // Return minimal headers for disallowed origins
    return {};
  }

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400", // 24 hours
  };
}

/**
 * Middleware handler for CORS validation and preflight requests.
 * Runs on all requests to /api/* routes.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only apply CORS handling to API routes
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const origin = request.headers.get("origin");
  const isAllowed = isOriginAllowed(origin);

  // Handle preflight OPTIONS requests
  if (request.method === "OPTIONS") {
    if (!isAllowed) {
      // Reject preflight for disallowed origins without CORS headers
      return new NextResponse(null, {
        status: 403,
      });
    }

    const headers = getCorsHeaders(origin);
    return new NextResponse(null, {
      status: 200,
      headers,
    });
  }

  // For non-preflight requests, add CORS headers if origin is allowed
  const response = NextResponse.next();
  const corsHeaders = getCorsHeaders(origin);

  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

export const config = {
  matcher: "/api/:path*",
};

