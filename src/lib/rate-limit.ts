/**
 * Sliding-window rate limiter (in-memory, production: Upstash Redis).
 *
 * Limits per-key (API key or IP) request rate using a sliding window counter.
 * Returns RFC 7807 problem+json on limit exceeded with Retry-After header.
 *
 * Usage in a route handler:
 *
 *   import { checkRateLimit } from '@/lib/rate-limit'
 *
 *   export async function GET(req: Request) {
 *     const limited = await checkRateLimit(req, { windowMs: 60_000, max: 100, scope: 'api' })
 *     if (limited) return limited.response
 *     // ... normal handler
 *   }
 */

interface RateLimitConfig {
  windowMs: number
  max: number
  scope: string // namespace (e.g. 'api', 'rml', 'eas', 'admin')
}

interface RateLimitEntry {
  timestamps: number[]
}

// In-memory store: Map<key+scope, entry>
const store = new Map<string, RateLimitEntry>()

// IP allowlist — requests from these IPs bypass rate limiting
const IP_ALLOWLIST = new Set<string>(
  (process.env.IP_ALLOWLIST ?? '127.0.0.1,::1,localhost').split(',').map((s) => s.trim()).filter(Boolean),
)

// Cleanup old entries every 60s to prevent memory leak
let lastCleanup = Date.now()
function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < 60000) return
  lastCleanup = now
  for (const [key, entry] of store.entries()) {
    entry.timestamps = entry.timestamps.filter((t) => now - t < 60000)
    if (entry.timestamps.length === 0) store.delete(key)
  }
}

export interface RateLimitResult {
  allowed: boolean
  response: Response | null
  remaining: number
  resetMs: number
}

export function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  const xri = req.headers.get('x-real-ip')
  if (xri) return xri
  return '0.0.0.0'
}

export function getApiKey(req: Request): string | null {
  const auth = req.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) return auth.slice(7)
  const xApiKey = req.headers.get('x-api-key')
  if (xApiKey) return xApiKey
  const url = new URL(req.url)
  const queryKey = url.searchParams.get('apiKey')
  return queryKey
}

export function checkRateLimit(req: Request, config: RateLimitConfig): RateLimitResult {
  cleanup()

  const ip = getClientIp(req)

  // Bypass for allowlisted IPs
  if (IP_ALLOWLIST.has(ip)) {
    return { allowed: true, response: null, remaining: config.max, resetMs: config.windowMs }
  }

  // Key = apiKey if present, otherwise IP
  const apiKey = getApiKey(req)
  const identifier = apiKey ?? ip
  const key = `${config.scope}:${identifier}`
  const now = Date.now()
  const windowStart = now - config.windowMs

  let entry = store.get(key)
  if (!entry) {
    entry = { timestamps: [] }
    store.set(key, entry)
  }

  // Drop timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart)

  if (entry.timestamps.length >= config.max) {
    const oldest = entry.timestamps[0]
    const resetMs = oldest + config.windowMs - now
    const retryAfter = Math.ceil(resetMs / 1000)

    const problemJson = {
      type: `https://rock887.fm/errors/rate-limited`,
      title: 'Rate limit exceeded',
      status: 429,
      detail: `Too many requests. You have exceeded the rate limit of ${config.max} requests per ${Math.floor(config.windowMs / 1000)}s for ${config.scope}.`,
      instance: req.url,
      scope: config.scope,
      limit: config.max,
      windowMs: config.windowMs,
      retryAfterSeconds: retryAfter,
    }

    return {
      allowed: false,
      response: new Response(JSON.stringify(problemJson), {
        status: 429,
        headers: {
          'Content-Type': 'application/problem+json',
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(config.max),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.floor(resetMs / 1000)),
        },
      }),
      remaining: 0,
      resetMs,
    }
  }

  entry.timestamps.push(now)
  const remaining = config.max - entry.timestamps.length
  const resetMs = entry.timestamps[0] + config.windowMs - now

  return { allowed: true, response: null, remaining, resetMs }
}

/**
 * IP allowlist check for protected routes (e.g. /api/v1/admin/*, /api/v1/eas/*).
 * Returns a 403 problem+json response if the IP is not allowlisted.
 */
export function checkIpAllowlist(req: Request, allowedIps: string[]): RateLimitResult {
  const ip = getClientIp(req)
  if (allowedIps.length === 0 || allowedIps.includes(ip) || IP_ALLOWLIST.has(ip)) {
    return { allowed: true, response: null, remaining: 1, resetMs: 0 }
  }

  const problemJson = {
    type: 'https://rock887.fm/errors/forbidden-ip',
    title: 'IP not allowed',
    status: 403,
    detail: `Access from IP ${ip} is not allowed on this endpoint. Contact the administrator to add your IP to the allowlist.`,
    instance: req.url,
    clientIp: ip,
  }

  return {
    allowed: false,
    response: new Response(JSON.stringify(problemJson), {
      status: 403,
      headers: { 'Content-Type': 'application/problem+json' },
    }),
    remaining: 0,
    resetMs: 0,
  }
}

/**
 * Per-route rate limit configurations.
 * Apply via middleware or at the top of each route handler.
 */
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  'api-general': { windowMs: 60_000, max: 100, scope: 'api' },
  'rml-send': { windowMs: 60_000, max: 30, scope: 'rml' },
  'eas-interrupt': { windowMs: 60_000, max: 5, scope: 'eas' },
  'admin-mutate': { windowMs: 60_000, max: 20, scope: 'admin' },
  'auth-login': { windowMs: 60_000, max: 10, scope: 'auth' },
  'webhook-test': { windowMs: 60_000, max: 10, scope: 'webhook-test' },
  'ai-copilot': { windowMs: 60_000, max: 20, scope: 'copilot' },
}
