import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Audio Processing Chain — Omnia 9 preset automation + Stereo Tool hot-spare.
 *
 * #19: Omnia 9 preset remote control & daypart automation
 * #20: Stereo Tool / Breakaway hot-spare processor (N+1 redundancy)
 *
 * GET /api/v1/processing         — current processing chain + presets + hot-spare status
 * POST /api/v1/processing         — switch preset, activate hot-spare, schedule daypart
 */

interface ProcessingPreset {
  id: string
  name: string
  description: string
  // Omnia 9 parameters
  targetLufs: number
  maxTruePeak: number
  agcRatio: number
  multibandCount: number
  // Daypart schedule
  daypart?: { startHour: number; endHour: number; daysOfWeek: number[] }
  active: boolean
}

interface HotSpareConfig {
  primaryProcessor: { name: string; host: string; status: 'active' | 'standby' | 'failed'; healthScore: number }
  spareProcessor: { name: string; host: string; status: 'active' | 'standby' | 'failed'; healthScore: number; warmStandby: boolean }
  switchoverTrigger: 'silence' | 'snmp-offline' | 'health-below-70' | 'manual'
  switchoverLatencyMs: number
  lastSwitchover: string | null
  switchoverCount: number
}

const PRESETS: ProcessingPreset[] = [
  { id: 'daypart', name: 'Daypart', description: 'Standard daytime processing (EBU R128 compliant)', targetLufs: -23, maxTruePeak: -1, agcRatio: 4, multibandCount: 5, daypart: { startHour: 6, endHour: 19, daysOfWeek: [1, 2, 3, 4, 5] }, active: true },
  { id: 'loud', name: 'Loud (Loudness War)', description: 'Aggressive loudness for competitive market', targetLufs: -16, maxTruePeak: -0.5, agcRatio: 8, multibandCount: 5, active: false },
  { id: 'sports', name: 'Sports', description: 'Enhanced speech clarity for live sports', targetLufs: -23, maxTruePeak: -1, agcRatio: 3, multibandCount: 4, daypart: { startHour: 13, endHour: 18, daysOfWeek: [0, 6] }, active: false },
  { id: 'night', name: 'Night', description: 'Relaxed processing for overnight', targetLufs: -25, maxTruePeak: -1.5, agcRatio: 2, multibandCount: 3, daypart: { startHour: 22, endHour: 6, daysOfWeek: [0, 1, 2, 3, 4, 5, 6] }, active: false },
  { id: 'news', name: 'News Bulletin', description: 'Optimized for speech intelligibility', targetLufs: -23, maxTruePeak: -1, agcRatio: 3, multibandCount: 4, active: false },
  { id: 'eas', name: 'EAS Override', description: 'Bypass processing for EAS alerts (flat passthrough)', targetLufs: -20, maxTruePeak: 0, agcRatio: 1, multibandCount: 0, active: false },
]

const HOT_SPARE: HotSpareConfig = {
  primaryProcessor: { name: 'Omnia 9 (Main)', host: '192.168.1.52', status: 'active', healthScore: 96 },
  spareProcessor: { name: 'Stereo Tool (Hot-Spare)', host: '192.168.1.53', status: 'standby', healthScore: 92, warmStandby: true },
  switchoverTrigger: 'silence',
  switchoverLatencyMs: 850,
  lastSwitchover: new Date(Date.now() - 86400000).toISOString(),
  switchoverCount: 3,
}

export async function GET() {
  await new Promise((r) => setTimeout(r, 80))

  // Check if daypart automation should switch preset
  const now = new Date()
  const hour = now.getHours()
  const dow = now.getDay()
  for (const preset of PRESETS) {
    if (preset.daypart && preset.daypart.daysOfWeek.includes(dow)) {
      const inWindow = preset.daypart.startHour <= preset.daypart.endHour
        ? (hour >= preset.daypart.startHour && hour < preset.daypart.endHour)
        : (hour >= preset.daypart.startHour || hour < preset.daypart.endHour)
      if (inWindow && !preset.active) {
        // Auto-switch
        for (const p of PRESETS) p.active = p.id === preset.id
      }
    }
  }

  return NextResponse.json({
    presets: PRESETS,
    activePreset: PRESETS.find((p) => p.active),
    hotSpare: HOT_SPARE,
    stats: {
      presetSwitches24h: 4,
      hotSpareSwitchovers: HOT_SPARE.switchoverCount,
      avgSwitchoverMs: HOT_SPARE.switchoverLatencyMs,
      primaryHealth: HOT_SPARE.primaryProcessor.healthScore,
      spareHealth: HOT_SPARE.spareProcessor.healthScore,
      redundancyActive: HOT_SPARE.spareProcessor.warmStandby,
    },
    daypartAutomation: {
      enabled: true,
      nextSwitch: PRESETS.find((p) => p.daypart && !p.active)?.name ?? null,
      description: 'Processing presets auto-switch at daypart boundaries via Schedule API',
    },
    tech: {
      primary: 'Omnia 9 (Telos Alliance) — SNMP/HTTP control interface',
      spare: 'Stereo Tool (Thimeo) via Wine — approaches hardware quality at low cost',
      switchLogic: 'Silence sensor >5s OR Omnia 9 SNMP offline OR health <70 → GPIO "Automation Bypass" switches to spare',
      warmStandby: 'Stereo Tool runs continuously (warm) — instant switchover, no audio gap',
    },
  })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))

  if (body.action === 'switch-preset' && body.presetId) {
    for (const p of PRESETS) p.active = p.id === body.presetId
    return NextResponse.json({ ok: true, activePreset: PRESETS.find((p) => p.active), message: `Switched to "${PRESETS.find((p) => p.active)?.name}" preset` })
  }

  if (body.action === 'activate-hot-spare') {
    HOT_SPARE.primaryProcessor.status = 'failed'
    HOT_SPARE.spareProcessor.status = 'active'
    HOT_SPARE.lastSwitchover = new Date().toISOString()
    HOT_SPARE.switchoverCount += 1
    return NextResponse.json({ ok: true, hotSpare: HOT_SPARE, message: '🚨 Switchover to Stereo Tool hot-spare — Omnia 9 marked failed' })
  }

  if (body.action === 'recover-primary') {
    HOT_SPARE.primaryProcessor.status = 'active'
    HOT_SPARE.spareProcessor.status = 'standby'
    return NextResponse.json({ ok: true, hotSpare: HOT_SPARE, message: 'Recovered to Omnia 9 primary — Stereo Tool back to warm standby' })
  }

  return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 })
}
