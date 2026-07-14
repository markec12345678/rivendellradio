import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  computeDaypart,
  type IngestionBatch,
  type PipelineStatus,
} from '@/lib/listener-pipeline/schema'
import { classifyDevice } from '@/lib/listener-pipeline/icecast-parser'

export const dynamic = 'force-dynamic'

/**
 * Listener Pipeline API — the reception point for real listener sessions.
 *
 * GET  — pipeline status. Honestly reports 0 sessions until real data arrives.
 * POST — ingest a batch of real sessions from an Icecast2 poller/adapter.
 *
 * DISCIPLINE (see docs/EPISTEMOLOGICAL-INVARIANTS.md, Invariant 1):
 *   This endpoint NEVER generates demo sessions. It NEVER seeds the table.
 *   It persists exactly what it receives, and what it receives must come
 *   from a real streaming server. The first POST that succeeds is the
 *   moment the system transitions from `simulated` to `observed` and the
 *   moment the first real entry in docs/STATION-CHRONICLE.md should be
 *   written.
 *
 * Until that first POST, GET returns totalSessions: 0 and that is the
 * honest state of the system.
 */

// In-memory state for pipeline status. In a real deployment this would
// live in the DB or a KV store. For the sandbox it is in-memory and
// resets on restart — which is fine, because the only honest state it
// can have before a real Icecast2 connects is "0 sessions, no source."
const pipelineState = {
  sourceUrl: null as string | null,
  connected: false,
  lastIngestionAt: null as string | null,
  lastPollAt: null as string | null,
  lastError: null as string | null,
}

export async function GET() {
  let totalSessions = 0
  try {
    totalSessions = await db.listenerSession.count()
  } catch {
    // If the table does not exist yet (db:push not run), report 0 honestly.
    totalSessions = 0
  }

  const status: PipelineStatus = {
    connected: pipelineState.connected,
    sourceUrl: pipelineState.sourceUrl,
    totalSessions,
    lastIngestionAt: pipelineState.lastIngestionAt,
    lastPollAt: pipelineState.lastPollAt,
    lastError: pipelineState.lastError,
    summary:
      totalSessions === 0
        ? 'No real listener sessions. The pipeline is configured and waiting for a real Icecast2 source. Zero rows is the honest state.'
        : `${totalSessions} real session(s) ingested. The system has transitioned from simulated to observed evidence. See docs/STATION-CHRONICLE.md — the first real entry should now be written.`,
  }

  return NextResponse.json({
    _disclaimer:
      'Listener Pipeline. This endpoint persists ONLY real sessions from a real streaming server. ' +
      'No simulated data is ever generated or stored here. See docs/EPISTEMOLOGICAL-INVARIANTS.md, Invariant 1.',
    status,
    // The shape of what we accept — for adapter implementers
    ingestionContract: {
      endpoint: 'POST /api/v1/listener-pipeline',
      body: 'IngestionBatch (see src/lib/listener-pipeline/schema.ts)',
      requiredFields: ['source', 'fetchedAt', 'sessions[]'],
      perSessionRequired: ['startedAt', 'endedAt', 'mount', 'listenerHash', 'userAgent'],
      listenerHashConstraint: 'must be a 64-char lowercase hex SHA-256 digest (salted)',
      saltEnvVar: 'LISTENER_HASH_SALT',
    },
    // How a real deployment connects
    deployment: {
      step1: 'Set LISTENER_HASH_SALT env var (openssl rand -hex 32)',
      step2: 'Deploy an Icecast2 adapter that polls /status-json.xsl',
      step3: 'Adapter diffs snapshots, hashes IPs, POSTs IngestionBatch here',
      step4: 'First successful POST transitions system to observed evidence',
      step5: 'Write first real entry in docs/STATION-CHRONICLE.md',
    },
  })
}

export async function POST(req: Request) {
  pipelineState.lastPollAt = new Date().toISOString()

  let body: IngestionBatch
  try {
    body = (await req.json()) as IngestionBatch
  } catch {
    pipelineState.lastError = 'Invalid JSON body'
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON body' },
      { status: 400 },
    )
  }

  // Validate the batch shape
  if (!body.source || !body.fetchedAt || !Array.isArray(body.sessions)) {
    pipelineState.lastError = 'Missing required fields: source, fetchedAt, sessions[]'
    return NextResponse.json(
      {
        ok: false,
        error: 'Missing required fields: source, fetchedAt, sessions[]',
      },
      { status: 400 },
    )
  }

  // Mark the source as configured. We do NOT mark connected=true until
  // at least one session persists successfully.
  pipelineState.sourceUrl = body.source

  // Validate and enrich each session
  const SHA256_HEX = /^[a-f0-9]{64}$/
  const persisted: string[] = []
  const rejected: { index: number; reason: string }[] = []

  for (let i = 0; i < body.sessions.length; i++) {
    const s = body.sessions[i]

    // Reject any session whose listenerHash is not a proper salted SHA-256.
    // This is the belt-and-suspenders guarantee that unhashed IPs are never
    // persisted, even if the adapter has a bug.
    if (!s.listenerHash || !SHA256_HEX.test(s.listenerHash)) {
      rejected.push({
        index: i,
        reason:
          'listenerHash must be a 64-char lowercase hex SHA-256 digest. Raw IPs are never persisted.',
      })
      continue
    }

    // Reject any session with non-positive duration
    const startMs = Date.parse(s.startedAt)
    const endMs = Date.parse(s.endedAt)
    if (isNaN(startMs) || isNaN(endMs) || endMs <= startMs) {
      rejected.push({
        index: i,
        reason: 'startedAt must be before endedAt, both must be valid ISO timestamps',
      })
      continue
    }

    const durationMs = endMs - startMs

    // Enrich: daypart + device classification
    const daypart = computeDaypart(s.startedAt)
    const device = classifyDevice(s.userAgent)

    // Returning-listener lookup: has this listenerHash appeared in the last 7 days?
    const sevenDaysAgo = new Date(startMs - 7 * 86400000)
    const previous = await db.listenerSession.findFirst({
      where: {
        listenerHash: s.listenerHash,
        startedAt: { gte: sevenDaysAgo, lt: new Date(startMs) },
      },
      select: { id: true },
    })
    const returning = !!previous

    // Generate UUID v4 (crypto.randomUUID, available in Node 18+ / Bun)
    const id = crypto.randomUUID()

    // Persist
    await db.listenerSession.create({
      data: {
        id,
        startedAt: new Date(startMs),
        endedAt: new Date(endMs),
        durationMs,
        mount: s.mount,
        listenerHash: s.listenerHash,
        userAgent: s.userAgent,
        device,
        geoRegion: s.geoRegion ?? null,
        referer: s.referer ?? null,
        daypart,
        tracksPlayed: 0, // enriched later by a separate track-correlation job
        returning,
        source: 'measured', // Invariant 1 — always
      },
    })
    persisted.push(id)
  }

  if (persisted.length > 0) {
    pipelineState.connected = true
    pipelineState.lastIngestionAt = new Date().toISOString()
    pipelineState.lastError = null
  } else {
    pipelineState.lastError =
      rejected.length > 0
        ? `All ${rejected.length} session(s) rejected`
        : 'Batch contained zero sessions'
  }

  // The response honestly reports what happened
  return NextResponse.json({
    ok: persisted.length > 0,
    ingested: persisted.length,
    rejected: rejected.length,
    rejections: rejected,
    firstRealSession:
      persisted.length > 0 && (await db.listenerSession.count()) === persisted.length
        ? 'YES — this was the first real session ever ingested. The system has transitioned from simulated to observed. Write the first entry in docs/STATION-CHRONICLE.md now.'
        : null,
    nextStep:
      persisted.length > 0
        ? 'Sessions persisted as source=measured. Downstream modules (station-memory, learning-loop, knowledge-engine) may now query real session data. They must label any derived finding sourceType=observed (not simulated) and cap confidence at 0.70 until an A/B test promotes it.'
        : 'No sessions persisted. Fix the adapter and re-POST. The pipeline will not invent data to fill the gap.',
  })
}
