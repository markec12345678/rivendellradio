import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

/**
 * Global rate-limiting middleware.
 *
 * Applies per-route rate limits defined in RATE_LIMITS. Returns RFC 7807
 * problem+json with Retry-After header on 429.
 *
 * In sandbox/dev: limits are generous and 127.0.0.1 bypasses all limits.
 * In production: tighten via env vars + add IP allowlists for admin/eas routes.
 */

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname

  // Skip rate limiting for static assets and CSP reporting
  if (
    path.startsWith('/_next/') ||
    path.startsWith('/static/') ||
    path === '/favicon.ico' ||
    path === '/manifest.webmanifest' ||
    path === '/sw.js' ||
    path === '/api/v1/csp-report' // let CSP reports through unconditionally
  ) {
    return NextResponse.next()
  }

  // Pick the rate limit config based on the route
  let configKey = 'api-general'

  if (path.startsWith('/api/rivendell/rml') || path.includes('/rml')) {
    configKey = 'rml-send'
  } else if (path.startsWith('/api/v1/eas')) {
    configKey = 'eas-interrupt'
  } else if (path.startsWith('/api/v1/admin') || path.startsWith('/api/v1/users')) {
    configKey = 'admin-mutate'
  } else if (path.startsWith('/api/auth')) {
    configKey = 'auth-login'
  } else if (path.includes('/webhook') && path.endsWith('/test')) {
    configKey = 'webhook-test'
  } else if (path.startsWith('/api/v1/copilot')) {
    configKey = 'ai-copilot'
  } else if (path.startsWith('/api/')) {
    configKey = 'api-general'
  } else {
    // Non-API routes (pages) — no rate limit
    return NextResponse.next()
  }

  const result = checkRateLimit(req as unknown as Request, RATE_LIMITS[configKey])
  if (!result.allowed && result.response) {
    // Forward the RFC 7807 response
    return new NextResponse(result.response.body, {
      status: result.response.status,
      headers: result.response.headers,
    })
  }

  // Add rate limit headers to the response
  const res = NextResponse.next()
  res.headers.set('X-RateLimit-Limit', String(RATE_LIMITS[configKey].max))
  res.headers.set('X-RateLimit-Remaining', String(result.remaining))
  res.headers.set('X-RateLimit-Reset', String(Math.ceil(result.resetMs / 1000)))
  return res
}

export const config = {
  matcher: [
    // Match all API routes
    '/api/:path*',
  ],
}
