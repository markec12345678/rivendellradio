import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * EBU R128 / ITU-R BS.1770-4 Loudness Metering API.
 *
 * Samples the post-Omnia 9 air-chain feed and reports:
 *   - Momentary LUFS (400ms window)
 *   - Short-term LUFS (3s window)
 *   - Integrated LUFS (gated, since stream start or last reset)
 *   - True Peak (dBTP)
 *   - Loudness Range (LRA)
 *
 * Compliance targets:
 *   EBU R128: -23 LUFS ±0.5, -1 dBTP max
 *   ATSC A/85: -24 LKFS ±2
 *   Spotify/YouTube: -14 LUFS (post-delivery normalization)
 *
 * GET /api/v1/loudness          — current metering state
 * GET /api/v1/loudness/history  — 24h compliance log
 * POST /api/v1/loudness/reset   — reset integrated LUFS counter
 */

interface LoudnessSample {
  timestamp: string
  momentaryLufs: number
  shortTermLufs: number
  truePeakDbtp: number
}

interface ComplianceTarget {
  standard: string
  targetLufs: number
  tolerance: number
  maxTruePeak: number
  region: string
}

const TARGETS: ComplianceTarget[] = [
  { standard: 'EBU R128', targetLufs: -23, tolerance: 0.5, maxTruePeak: -1, region: 'Europe' },
  { standard: 'ATSC A/85', targetLufs: -24, tolerance: 2, maxTruePeak: -2, region: 'USA' },
  { standard: 'Spotify', targetLufs: -14, tolerance: 0, maxTruePeak: -1, region: 'Streaming' },
  { standard: 'YouTube', targetLufs: -14, tolerance: 0, maxTruePeak: -1, region: 'Streaming' },
  { standard: 'Apple Music', targetLufs: -16, tolerance: 0, maxTruePeak: -1, region: 'Streaming' },
  { standard: 'Tidal', targetLufs: -14, tolerance: 0, maxTruePeak: -1, region: 'Streaming' },
]

// In-memory state (production: libebur128/ffmpeg ebur128 filter on the live feed)
const history: LoudnessSample[] = []
const MAX_HISTORY = 8640 // 24h @ 10s resolution

let integratedLufs = -23.1
let integratedStart = new Date(Date.now() - 3600000).toISOString()
let lra = 7.2
let truePeakMax = -1.3
let violationCount = 0
let lastViolation: { timestamp: string; type: 'lufs' | 'true-peak'; value: number; target: number } | null = null

function sample(): LoudnessSample {
  // Simulate program audio with occasional drift
  const drift = (Math.random() - 0.5) * 0.8
  const momentary = -22.5 + drift + (Math.random() - 0.5) * 4
  const shortTerm = -23.1 + drift * 0.5 + (Math.random() - 0.5) * 1.5
  const truePeak = -1.2 + (Math.random() - 0.5) * 0.6

  // Occasionally violate (5% chance)
  if (Math.random() < 0.05) {
    const isLufsViolation = Math.random() < 0.7
    if (isLufsViolation) {
      const value = -19.5 + Math.random() * 2 // too loud
      violationCount += 1
      lastViolation = { timestamp: new Date().toISOString(), type: 'lufs', value, target: -23 }
    } else {
      const value = -0.5 + Math.random() * 0.8 // true peak over
      violationCount += 1
      lastViolation = { timestamp: new Date().toISOString(), type: 'true-peak', value, target: -1 }
    }
  }

  return {
    timestamp: new Date().toISOString(),
    momentaryLufs: Math.round(momentary * 10) / 10,
    shortTermLufs: Math.round(shortTerm * 10) / 10,
    truePeakDbtp: Math.round(truePeak * 100) / 100,
  }
}

export async function GET(req: Request) {
  await new Promise((r) => setTimeout(r, 80))
  const url = new URL(req.url)
  const includeHistory = url.searchParams.get('history') !== 'false'
  const historyLimit = Math.min(parseInt(url.searchParams.get('limit') ?? '60'), 8640)

  const s = sample()
  history.push(s)
  if (history.length > MAX_HISTORY) history.shift()

  // Update integrated + true peak max
  integratedLufs = integratedLufs * 0.95 + s.shortTermLufs * 0.05
  if (s.truePeakDbtp > truePeakMax) truePeakMax = s.truePeakDbtp

  const ebuTarget = TARGETS[0]
  const compliant =
    Math.abs(integratedLufs - ebuTarget.targetLufs) <= ebuTarget.tolerance && truePeakMax <= ebuTarget.maxTruePeak

  // 24h compliance stats
  const last24h = history.slice(-8640)
  const violationsLast24h = last24h.filter(
    (h) => Math.abs(h.shortTermLufs - ebuTarget.targetLufs) > ebuTarget.tolerance * 2 || h.truePeakDbtp > ebuTarget.maxTruePeak,
  ).length
  const compliancePct = last24h.length > 0 ? Math.round(((last24h.length - violationsLast24h) / last24h.length) * 1000) / 10 : 100

  return NextResponse.json({
    current: {
      momentaryLufs: s.momentaryLufs,
      shortTermLufs: s.shortTermLufs,
      integratedLufs: Math.round(integratedLufs * 10) / 10,
      truePeakDbtp: s.truePeakDbtp,
      truePeakMax: Math.round(truePeakMax * 100) / 100,
      lra: Math.round(lra * 10) / 10,
    },
    integrated: {
      lufs: Math.round(integratedLufs * 10) / 10,
      since: integratedStart,
      durationMs: Date.now() - new Date(integratedStart).getTime(),
    },
    compliance: {
      standard: ebuTarget.standard,
      target: { lufs: ebuTarget.targetLufs, tolerance: ebuTarget.tolerance, maxTruePeak: ebuTarget.maxTruePeak },
      current: { integratedLufs: Math.round(integratedLufs * 10) / 10, truePeakMax: Math.round(truePeakMax * 100) / 100 },
      compliant,
      delta: Math.round((integratedLufs - ebuTarget.targetLufs) * 10) / 10,
      compliancePct24h: compliancePct,
      violations24h: violationsLast24h,
      totalViolations: violationCount,
      lastViolation,
    },
    targets: TARGETS,
    history: includeHistory ? history.slice(-historyLimit) : [],
    metering: {
      algorithm: 'ITU-R BS.1770-4',
      implementation: 'libebur128 (production) / simulated (sandbox)',
      momentaryWindowMs: 400,
      shortTermWindowMs: 3000,
      gating: 'relative gate at -10 LU',
      samplingRateHz: 48000,
    },
  })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))

  if (body.reset === true) {
    integratedLufs = -23
    integratedStart = new Date().toISOString()
    truePeakMax = -1
    violationCount = 0
    lastViolation = null
    return NextResponse.json({ ok: true, message: 'Integrated LUFS counter reset.', integratedStart })
  }

  return NextResponse.json({ ok: true, current: { integratedLufs, truePeakMax, lra } })
}
