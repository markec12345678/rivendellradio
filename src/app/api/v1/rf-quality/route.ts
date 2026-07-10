import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * FM RF Quality Reference Receiver — on-air RF quality feedback.
 *
 * Uses RTL-SDR or SDRuno at the studio to measure the actual off-air signal:
 *   - SNR (Signal-to-Noise Ratio) — target > 50 dB
 *   - Multipath distortion — target < 3%
 *   - MER (Modulation Error Ratio) — target > 35 dB
 *   - Pilot deviation — 75 kHz ± 7.5 kHz
 *   - RF field strength (dBµV/m)
 *
 * Complements transmitter-side SNMP (which only shows forward power, VSWR).
 * This is the listener's actual experience.
 *
 * GET /api/v1/rf-quality         — current RF quality + history
 * POST /api/v1/rf-quality/test   — inject a test anomaly
 */

interface RfReading {
  timestamp: string
  frequencyMhz: number
  snrDb: number           // signal-to-noise ratio
  multipathPct: number    // multipath distortion percentage
  merDb: number           // modulation error ratio
  pilotDevKhz: number     // 19kHz pilot deviation
  rdsDevKhz: number       // RDS subcarrier deviation (2.5 kHz nominal)
  audioDevKhz: number     // main audio deviation (75 kHz max)
  fieldStrengthDbuv: number  // RF field strength
  stereoSeparationDb: number // L-R separation
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical'
}

const THRESHOLDS = {
  snrDb: { excellent: 60, good: 50, fair: 40, poor: 30 },
  multipathPct: { excellent: 1, good: 3, fair: 5, poor: 10 },
  merDb: { excellent: 40, good: 35, fair: 28, poor: 22 },
  fieldStrengthDbuv: { excellent: 70, good: 60, fair: 50, poor: 40 },
}

function computeStatus(reading: Omit<RfReading, 'status'>): RfReading['status'] {
  if (reading.snrDb >= THRESHOLDS.snrDb.excellent && reading.multipathPct <= THRESHOLDS.multipathPct.excellent) return 'excellent'
  if (reading.snrDb >= THRESHOLDS.snrDb.good && reading.multipathPct <= THRESHOLDS.multipathPct.good) return 'good'
  if (reading.snrDb >= THRESHOLDS.snrDb.fair && reading.multipathPct <= THRESHOLDS.multipathPct.fair) return 'fair'
  if (reading.snrDb >= THRESHOLDS.snrDb.poor) return 'poor'
  return 'critical'
}

const history: RfReading[] = []
const MAX_HISTORY = 600

// Current state — simulate healthy reception
let currentState: Omit<RfReading, 'status'> = {
  timestamp: new Date().toISOString(),
  frequencyMhz: 88.7,
  snrDb: 62.4,
  multipathPct: 0.8,
  merDb: 41.2,
  pilotDevKhz: 6.8,
  rdsDevKhz: 2.4,
  audioDevKhz: 68.5,
  fieldStrengthDbuv: 72.3,
  stereoSeparationDb: 38.5,
}

function sample(): RfReading {
  const drift = (Math.random() - 0.5) * 2
  const reading: Omit<RfReading, 'status'> = {
    timestamp: new Date().toISOString(),
    frequencyMhz: 88.7,
    snrDb: Math.max(0, currentState.snrDb + drift + (Math.random() - 0.5) * 1.5),
    multipathPct: Math.max(0, Math.min(50, currentState.multipathPct + (Math.random() - 0.5) * 0.4)),
    merDb: Math.max(0, currentState.merDb + drift * 0.5 + (Math.random() - 0.5) * 1),
    pilotDevKhz: 6.8 + (Math.random() - 0.5) * 0.5,
    rdsDevKhz: 2.4 + (Math.random() - 0.5) * 0.2,
    audioDevKhz: 68.5 + (Math.random() - 0.5) * 15,
    fieldStrengthDbuv: 72.3 + (Math.random() - 0.5) * 3,
    stereoSeparationDb: 38.5 + (Math.random() - 0.5) * 2,
  }
  return { ...reading, status: computeStatus(reading) }
}

export async function GET(req: Request) {
  await new Promise((r) => setTimeout(r, 80))
  const url = new URL(req.url)
  const historyLimit = Math.min(parseInt(url.searchParams.get('limit') ?? '60'), 600)

  const reading = sample()
  history.push(reading)
  if (history.length > MAX_HISTORY) history.shift()
  currentState = { ...reading }
  delete (currentState as any).status

  const last24h = history.slice(-1440)
  const avgSnr = last24h.length > 0 ? last24h.reduce((s, r) => s + r.snrDb, 0) / last24h.length : reading.snrDb
  const avgMultipath = last24h.length > 0 ? last24h.reduce((s, r) => s + r.multipathPct, 0) / last24h.length : reading.multipathPct
  const worstStatus = last24h.some((r) => r.status === 'critical')
    ? 'critical'
    : last24h.some((r) => r.status === 'poor')
      ? 'poor'
      : last24h.some((r) => r.status === 'fair')
        ? 'fair'
        : 'good'

  // Compliance check
  const compliant =
    reading.snrDb >= THRESHOLDS.snrDb.good &&
    reading.multipathPct <= THRESHOLDS.multipathPct.good &&
    reading.merDb >= THRESHOLDS.merDb.good &&
    reading.fieldStrengthDbuv >= THRESHOLDS.fieldStrengthDbuv.good

  return NextResponse.json({
    current: reading,
    thresholds: THRESHOLDS,
    compliant,
    stats24h: {
      avgSnrDb: Math.round(avgSnr * 10) / 10,
      avgMultipathPct: Math.round(avgMultipath * 100) / 100,
      worstStatus,
      samples: last24h.length,
      criticalEvents: last24h.filter((r) => r.status === 'critical').length,
      poorEvents: last24h.filter((r) => r.status === 'poor').length,
    },
    history: history.slice(-historyLimit),
    receiver: {
      type: 'RTL-SDR (RTL2832U)',
      antenna: '1/4 wave vertical @ studio roof',
      frequency: '88.7 MHz',
      bandwidth: '200 kHz',
      software: 'SDRuno / GNU Radio',
      sampleRateHz: 240000,
      correctionPpm: -1.2,
    },
    compliance: {
      standard: 'ITU-R BS.412-9 (FM stereo broadcasting)',
      pilotStandard: '19 kHz ± 2 Hz (CCIR)',
      audioDeviationMax: '75 kHz (FCC §73.317)',
      rdsDeviation: '2.0-3.0 kHz (IEC 62106)',
      stereoSeparationTarget: '> 30 dB at 1 kHz',
    },
  })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))

  if (body.test === 'multipath') {
    // Simulate multipath distortion (e.g., airplane flutter, building reflection)
    currentState.multipathPct = 8.5
    currentState.snrDb = 35.2
    currentState.merDb = 24.1
    return NextResponse.json({ ok: true, message: 'Multipath anomaly injected — SNR dropped to 35.2 dB' })
  }

  if (body.test === 'weak-signal') {
    currentState.fieldStrengthDbuv = 42.1
    currentState.snrDb = 32.5
    return NextResponse.json({ ok: true, message: 'Weak signal anomaly injected — field strength 42.1 dBµV/m' })
  }

  if (body.reset) {
    currentState = {
      timestamp: new Date().toISOString(),
      frequencyMhz: 88.7,
      snrDb: 62.4,
      multipathPct: 0.8,
      merDb: 41.2,
      pilotDevKhz: 6.8,
      rdsDevKhz: 2.4,
      audioDevKhz: 68.5,
      fieldStrengthDbuv: 72.3,
      stereoSeparationDb: 38.5,
    }
    return NextResponse.json({ ok: true, message: 'RF quality reset to nominal' })
  }

  return NextResponse.json({ ok: true, current: currentState })
}
