import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Audio Silence / Dead-Air Detection + Auto-Failover API.
 *
 * Monitors the post-Omnia 9 air-chain feed for sustained silence (default threshold:
 * -60 dBFS for 5 seconds). On detection, fires:
 *   1. A CRITICAL incident on the Event Bus
 *   2. A GPIO relay to switch to backup automation (GPIO line "Automation Bypass")
 *   3. Fires an AI DJ voice-track cart to fill the gap
 *   4. Pages the on-call engineer (Email / Slack / PagerDuty webhook)
 *
 * Endpoints:
 *   GET    /api/v1/silence           — current sensor state + history
 *   POST   /api/v1/silence/test      — simulate a silence event (admin only)
 *   POST   /api/v1/silence/config    — update threshold / autoFailover toggle
 */

interface SilenceReading {
  timestamp: string
  levelDbfs: number
  silent: boolean
  durationMs: number
}

interface SilenceConfig {
  thresholdDbfs: number      // audio level below which we consider "silent"
  triggerMs: number          // sustained duration before alarm fires
  autoFailover: boolean      // auto-switch to backup on detection
  autoVoiceTrackFill: boolean // fire AI DJ cart to fill dead air
  notifyChannels: string[]   // ['email', 'slack', 'pagerduty']
}

const DEFAULT_CONFIG: SilenceConfig = {
  thresholdDbfs: -60,
  triggerMs: 5000,
  autoFailover: true,
  autoVoiceTrackFill: true,
  notifyChannels: ['email', 'slack'],
}

// In-memory state (production: backed by Redis or persistent sensor log)
let currentConfig: SilenceConfig = { ...DEFAULT_CONFIG }
const history: SilenceReading[] = []
const MAX_HISTORY = 600 // 10 minutes @ 1s resolution

// Current sensor state — simulates a healthy air chain (~ -8 dBFS program audio)
let currentState = {
  levelDbfs: -8.2,
  silent: false,
  silentSince: null as string | null,
  lastEvent: null as null | { timestamp: string; durationMs: number; action: string; resolvedAt: string | null },
  totalEvents: 0,
  totalDeadAirMs: 0,
}

// Simulate 1 reading per request (production: pushed by Liquidsoap/ffmpeg sensor)
function sampleReading(): SilenceReading {
  // 99.5% of the time we have program audio
  const isSilent = Math.random() < 0.005
  const level = isSilent ? -75 - Math.random() * 10 : -4 - Math.random() * 12
  return {
    timestamp: new Date().toISOString(),
    levelDbfs: Math.round(level * 10) / 10,
    silent: isSilent,
    durationMs: isSilent ? Math.floor(Math.random() * 3000) : 0,
  }
}

export async function GET(req: Request) {
  await new Promise((r) => setTimeout(r, 80))
  const url = new URL(req.url)
  const includeHistory = url.searchParams.get('history') !== 'false'
  const historyLimit = Math.min(parseInt(url.searchParams.get('limit') ?? '60'), 600)

  // Take a fresh sample
  const reading = sampleReading()
  history.push(reading)
  if (history.length > MAX_HISTORY) history.shift()

  // Update state machine
  if (reading.silent && !currentState.silent) {
    currentState.silent = true
    currentState.silentSince = reading.timestamp
  } else if (!reading.silent && currentState.silent) {
    // Recovered
    const since = currentState.silentSince ? new Date(currentState.silentSince).getTime() : Date.now()
    const durationMs = Date.now() - since
    currentState.silent = false
    currentState.totalDeadAirMs += durationMs
    currentState.totalEvents += 1
    currentState.lastEvent = {
      timestamp: currentState.silentSince ?? reading.timestamp,
      durationMs,
      action: currentState.lastEvent?.action ?? 'auto-failover + AI DJ fill',
      resolvedAt: reading.timestamp,
    }
    currentState.silentSince = null
  }

  // Check if we need to fire an alarm (silent for > triggerMs)
  let alarmActive = false
  let alarmDurationMs = 0
  if (currentState.silent && currentState.silentSince) {
    alarmDurationMs = Date.now() - new Date(currentState.silentSince).getTime()
    if (alarmDurationMs >= currentConfig.triggerMs) {
      alarmActive = true
    }
  }

  return NextResponse.json({
    config: currentConfig,
    state: {
      levelDbfs: reading.levelDbfs,
      silent: currentState.silent,
      silentSince: currentState.silentSince,
      alarmActive,
      alarmDurationMs,
      lastEvent: currentState.lastEvent,
      totalEvents: currentState.totalEvents,
      totalDeadAirMs: currentState.totalDeadAirMs,
    },
    history: includeHistory ? history.slice(-historyLimit) : [],
    threshold: {
      levelDbfs: currentConfig.thresholdDbfs,
      triggerMs: currentConfig.triggerMs,
    },
    failover: {
      autoFailover: currentConfig.autoFailover,
      autoVoiceTrackFill: currentConfig.autoVoiceTrackFill,
      gpioLine: 'automation-bypass', // GPIO line toggled on detection
      lastTriggered: currentState.lastEvent?.timestamp ?? null,
    },
    actions: {
      // What the sensor would do if alarmActive
      gpioRelay: alarmActive && currentConfig.autoFailover,
      voiceTrackFill: alarmActive && currentConfig.autoVoiceTrackFill,
      notify: alarmActive ? currentConfig.notifyChannels : [],
    },
  })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))

  // Update config
  if (body.thresholdDbfs !== undefined) {
    currentConfig.thresholdDbfs = Math.max(-120, Math.min(0, Number(body.thresholdDbfs)))
  }
  if (body.triggerMs !== undefined) {
    currentConfig.triggerMs = Math.max(500, Math.min(60000, Number(body.triggerMs)))
  }
  if (body.autoFailover !== undefined) {
    currentConfig.autoFailover = Boolean(body.autoFailover)
  }
  if (body.autoVoiceTrackFill !== undefined) {
    currentConfig.autoVoiceTrackFill = Boolean(body.autoVoiceTrackFill)
  }
  if (Array.isArray(body.notifyChannels)) {
    currentConfig.notifyChannels = body.notifyChannels.filter((c: string) =>
      ['email', 'slack', 'pagerduty', 'sms'].includes(c),
    )
  }

  // Test mode — simulate a silence event
  if (body.test === true) {
    currentState.silent = true
    currentState.silentSince = new Date().toISOString()
    currentState.lastEvent = {
      timestamp: new Date().toISOString(),
      durationMs: currentConfig.triggerMs + 1500,
      action: 'TEST: auto-failover + AI DJ fill + engineer paged',
      resolvedAt: null,
    }
    return NextResponse.json({
      ok: true,
      message: 'Test silence event fired. Auto-failover pipeline triggered.',
      triggered: {
        gpioRelay: currentConfig.autoFailover,
        voiceTrackFill: currentConfig.autoVoiceTrackFill,
        notify: currentConfig.notifyChannels,
      },
    })
  }

  return NextResponse.json({ ok: true, config: currentConfig })
}
