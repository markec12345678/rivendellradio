import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * IFB / Talkback / Cue Audio Bus.
 *
 * #14: Implement a cue bus in the audio chain routing program audio minus the
 * host mic to the presenter's headphones, with programmable interrupt source
 * (producer mic, news mic, guest).
 *
 * GET /api/v1/cue-bus         — cue bus routing + IFB sources + levels
 * POST /api/v1/cue-bus         — configure routing, set interrupt source
 *
 * IFB = Interruptible Foldback (a.k.a. talkback) — lets producer interrupt
 * the presenter's headphone mix with instructions during live broadcast.
 */

interface CueBusChannel {
  id: string
  name: string
  type: 'program-minus-mic' | 'program' | 'producer-mic' | 'news-mic' | 'guest-mic' | 'pre-fade-listen'
  levelDb: number
  muted: boolean
  // Routing to headphone outputs
  routedTo: string[]  // presenter-1, presenter-2, guest-1, producer
}

interface HeadphoneMix {
  id: string
  name: string        // 'Presenter 1 (Alex)', 'Guest (Dr. Lee)'
  channels: { channelId: string; levelDb: number; muted: boolean }[]
  // IFB interrupt
  ifbSource: string | null  // which channel can interrupt (producer-mic, news-mic)
  ifbLevelDb: number  // how loud the interrupt plays (-6 dB typical)
  ifbDuckAmount: number  // how much to duck program audio during interrupt (-12 dB)
  // Output
  outputDevice: string  // 'presenter-headphones', 'guest-headphones'
  connected: boolean
}

const CHANNELS: CueBusChannel[] = [
  { id: 'ch-program-mic', name: 'Program (minus host mic)', type: 'program-minus-mic', levelDb: -8, muted: false, routedTo: ['presenter-1', 'guest-1'] },
  { id: 'ch-program', name: 'Program (full mix)', type: 'program', levelDb: -10, muted: false, routedTo: ['producer'] },
  { id: 'ch-producer', name: 'Producer Mic (IFB)', type: 'producer-mic', levelDb: -6, muted: false, routedTo: ['presenter-1'] },
  { id: 'ch-news', name: 'News Mic (IFB)', type: 'news-mic', levelDb: -6, muted: true, routedTo: [] },
  { id: 'ch-guest', name: 'Guest Mic', type: 'guest-mic', levelDb: -8, muted: false, routedTo: ['presenter-1'] },
  { id: 'ch-pfl', name: 'Pre-Fade Listen', type: 'pre-fade-listen', levelDb: 0, muted: true, routedTo: ['producer'] },
]

const HEADPHONE_MIXES: HeadphoneMix[] = [
  { id: 'mix-presenter-1', name: 'Presenter 1 (Alex)', channels: [{ channelId: 'ch-program-mic', levelDb: -8, muted: false }, { channelId: 'ch-producer', levelDb: -6, muted: false }, { channelId: 'ch-guest', levelDb: -8, muted: false }], ifbSource: 'ch-producer', ifbLevelDb: -6, ifbDuckAmount: -12, outputDevice: 'presenter-headphones', connected: true },
  { id: 'mix-guest-1', name: 'Guest (Dr. Lee)', channels: [{ channelId: 'ch-program-mic', levelDb: -10, muted: false }], ifbSource: 'ch-producer', ifbLevelDb: -6, ifbDuckAmount: -12, outputDevice: 'guest-headphones', connected: true },
  { id: 'mix-producer', name: 'Producer (Sara)', channels: [{ channelId: 'ch-program', levelDb: -10, muted: false }, { channelId: 'ch-pfl', levelDb: 0, muted: true }], ifbSource: null, ifbLevelDb: 0, ifbDuckAmount: 0, outputDevice: 'producer-headphones', connected: true },
]

export async function GET() {
  await new Promise((r) => setTimeout(r, 80))
  return NextResponse.json({
    channels: CHANNELS,
    headphoneMixes: HEADPHONE_MIXES,
    stats: {
      totalChannels: CHANNELS.length,
      activeChannels: CHANNELS.filter((c) => !c.muted).length,
      totalMixes: HEADPHONE_MIXES.length,
      connectedOutputs: HEADPHONE_MIXES.filter((m) => m.connected).length,
      ifbActiveSources: HEADPHONE_MIXES.filter((m) => m.ifbSource).length,
    },
    ifbExplanation: {
      what: 'IFB (Interruptible Foldback) lets the producer interrupt the presenter\'s headphone mix with instructions during live broadcast',
      how: 'When producer speaks into producer-mic, program audio ducks by -12dB and producer mic plays at -6dB',
      useCase: 'Producer can say "30 seconds to news" without listeners hearing',
    },
    tech: {
      implementation: 'Liquidsoap source.tee() + amplify() for ducking, or Studer GPIO logic',
      duckAlgorithm: 'When IFB source active → program level *= 10^(-12/20) = 0.25',
      latency: '<10ms (in-process audio routing)',
    },
  })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))

  if (body.action === 'set-ifb-source' && body.mixId && body.sourceId !== undefined) {
    const m = HEADPHONE_MIXES.find((x) => x.id === body.mixId)
    if (m) {
      m.ifbSource = body.sourceId ?? null
      return NextResponse.json({ ok: true, mix: m, message: `IFB source updated for ${m.name}` })
    }
  }

  if (body.action === 'set-level' && body.mixId && body.channelId !== undefined && body.levelDb !== undefined) {
    const m = HEADPHONE_MIXES.find((x) => x.id === body.mixId)
    if (m) {
      const ch = m.channels.find((c) => c.channelId === body.channelId)
      if (ch) {
        ch.levelDb = body.levelDb
        return NextResponse.json({ ok: true, channel: ch })
      }
    }
  }

  if (body.action === 'trigger-ifb' && body.mixId) {
    // Simulate producer pressing IFB button
    return NextResponse.json({
      ok: true,
      message: `IFB triggered on ${body.mixId} — program ducked -12dB, producer mic active at -6dB`,
      duration: 'until producer releases',
    })
  }

  return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 })
}
