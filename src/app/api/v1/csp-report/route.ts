import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * CSP violation report endpoint (Reporting API + legacy report-uri).
 * Persists violations to AuditLog for inspection in the Audit panel.
 * Returns 204 No Content per the Reporting API spec.
 */
export async function POST(req: Request) {
  try {
    let body: any
    try {
      body = await req.json()
    } catch {
      return new NextResponse(null, { status: 204 })
    }

    // The Reporting API wraps reports in { body: [...] } or sends a single object
    const reports = Array.isArray(body) ? body : body?.body ? [body] : [body]

    for (const report of reports) {
      const r = report?.body ?? report
      if (!r) continue

      const details = JSON.stringify({
        type: 'csp-violation',
        documentURL: r['document-uri'] ?? null,
        referrer: r.referrer ?? null,
        violatedDirective: r['violated-directive'] ?? r['effective-directive'] ?? null,
        blockedURI: r['blocked-uri'] ?? null,
        sourceFile: r['source-file'] ?? null,
        lineNumber: r['line-number'] ?? null,
        columnNumber: r['column-number'] ?? null,
        statusCode: r['status-code'] ?? null,
        userAgent: req.headers.get('user-agent') ?? null,
      })

      try {
        await db.auditLog.create({
          data: {
            action: 'csp-violation',
            entity: 'security',
            entityId: r['blocked-uri'] ?? r['violated-directive'] ?? 'unknown',
            details,
          },
        })
      } catch {
        // DB may be unavailable — fail silently, still return 204
      }
    }

    return new NextResponse(null, { status: 204 })
  } catch {
    return new NextResponse(null, { status: 204 })
  }
}
