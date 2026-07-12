import { describe, expect, test, beforeEach } from 'bun:test'
import { checkRateLimit, checkIpAllowlist, RATE_LIMITS } from '../src/lib/rate-limit'

// Mock Request for testing
function makeRequest(ip: string = '1.2.3.4', apiKey?: string): Request {
  const headers = new Headers()
  if (apiKey) headers.set('authorization', `Bearer ${apiKey}`)
  headers.set('x-forwarded-for', ip)
  return new Request('http://localhost:3000/api/v1/test', { headers })
}

describe('Rate Limiter', () => {
  test('RATE_LIMITS has correct configurations', () => {
    expect(RATE_LIMITS['api-general'].max).toBe(100)
    expect(RATE_LIMITS['api-general'].windowMs).toBe(60_000)
    expect(RATE_LIMITS['rml-send'].max).toBe(30)
    expect(RATE_LIMITS['eas-interrupt'].max).toBe(5)
    expect(RATE_LIMITS['auth-login'].max).toBe(10)
  })

  test('allows first request', () => {
    const req = makeRequest('1.2.3.4')
    const result = checkRateLimit(req, RATE_LIMITS['api-general'])
    expect(result.allowed).toBe(true)
    expect(result.response).toBeNull()
    expect(result.remaining).toBe(99)
  })

  test('blocks after exceeding limit', () => {
    const req = makeRequest('2.3.4.5')
    const config = { windowMs: 60_000, max: 3, scope: 'test' }

    // First 3 requests should pass
    for (let i = 0; i < 3; i++) {
      const result = checkRateLimit(req, config)
      expect(result.allowed).toBe(true)
    }

    // 4th request should be blocked
    const blocked = checkRateLimit(req, config)
    expect(blocked.allowed).toBe(false)
    expect(blocked.response).not.toBeNull()
    expect(blocked.response?.status).toBe(429)
  })

  test('returns RFC 7807 problem+json on block', async () => {
    const req = makeRequest('3.4.5.6')
    const config = { windowMs: 60_000, max: 1, scope: 'test-problem' }

    checkRateLimit(req, config) // first request passes
    const blocked = checkRateLimit(req, config)
    expect(blocked.response).not.toBeNull()

    const body = await blocked.response!.json()
    expect(body.status).toBe(429)
    expect(body.title).toBe('Rate limit exceeded')
    expect(body.type).toBe('https://rock887.fm/errors/rate-limited')
  })

  test('includes Retry-After header on 429', () => {
    const req = makeRequest('4.5.6.7')
    const config = { windowMs: 60_000, max: 1, scope: 'test-retry' }

    checkRateLimit(req, config)
    const blocked = checkRateLimit(req, config)
    expect(blocked.response?.headers.get('Retry-After')).not.toBeNull()
    expect(blocked.response?.headers.get('Content-Type')).toBe('application/problem+json')
  })

  test('separate limits per IP', () => {
    const req1 = makeRequest('5.6.7.8')
    const req2 = makeRequest('6.7.8.9')
    const config = { windowMs: 60_000, max: 1, scope: 'test-per-ip' }

    expect(checkRateLimit(req1, config).allowed).toBe(true)
    expect(checkRateLimit(req2, config).allowed).toBe(true) // different IP, allowed
    expect(checkRateLimit(req1, config).allowed).toBe(false) // same IP, blocked
  })
})

describe('IP Allowlist', () => {
  test('allows allowlisted IPs', () => {
    const req = makeRequest('127.0.0.1')
    const result = checkIpAllowlist(req, [])
    expect(result.allowed).toBe(true)
  })

  test('blocks non-allowlisted IPs when allowlist is set', () => {
    const req = makeRequest('9.9.9.9')
    const result = checkIpAllowlist(req, ['1.2.3.4'])
    expect(result.allowed).toBe(false)
    expect(result.response?.status).toBe(403)
  })

  test('allows empty allowlist (no restriction)', () => {
    const req = makeRequest('9.9.9.9')
    const result = checkIpAllowlist(req, [])
    expect(result.allowed).toBe(true)
  })
})
