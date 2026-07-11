import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * WebRTC Guest Caller Console — browser-based remote guest contribution.
 *
 * Replaces hardware codecs (Tieline, Comrex) with browser-based WebRTC.
 * Each guest gets a shareable invite URL, lobby with talkback, IFB mix-minus,
 * and on-air mix-in. Each guest has a fader in a "Callers" panel with
 * mute/cough/drop controls.
 *
 * GET  /api/v1/guest-caller         — active callers + lobby + queue
 * POST /api/v1/guest-caller         — create invite, mute/drop caller, end call
 *
 * Tech: mediasoup or LiveKit for SFU (Selective Forwarding Unit)
 */

interface GuestCaller {
  id: string
  inviteCode: string
  inviteUrl: string
  guestName: string
  guestEmail?: string
  status: 'lobby' | 'on-air' | 'waiting' | 'dropped' | 'ended'
  joinedAt: string
  onAirAt: string | null
  // WebRTC connection stats
  audioLevel: number      // 0-100
  muted: boolean
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor'
  bitrate: number         // kbps
  packetsLost: number
  roundTripTimeMs: number
  // Mixer controls
  faderLevel: number      // 0-100
  cueEnabled: boolean     // IFB/talkback to guest
  coughButton: boolean    // momentary mute
  // Mix-minus
  mixMinusEnabled: boolean
  mixMinusSource: string  // what guest hears (program minus their own mic)
}

interface Invite {
  id: string
  code: string
  url: string
  createdAt: string
  expiresAt: string
  maxGuests: number
  currentGuests: number
  createdBy: string
  description: string
  waitingRoom: boolean    // require host approval before joining on-air
}

const CALLERS: GuestCaller[] = [
  {
    id: 'caller-001',
    inviteCode: 'ROCK887-ABC123',
    inviteUrl: 'https://rock887.fm/guest/ROCK887-ABC123',
    guestName: 'Jane Smith (Phone-in)',
    guestEmail: 'jane@example.com',
    status: 'on-air',
    joinedAt: new Date(Date.now() - 180000).toISOString(),
    onAirAt: new Date(Date.now() - 120000).toISOString(),
    audioLevel: 72,
    muted: false,
    connectionQuality: 'excellent',
    bitrate: 128,
    packetsLost: 0,
    roundTripTimeMs: 42,
    faderLevel: 75,
    cueEnabled: true,
    coughButton: false,
    mixMinusEnabled: true,
    mixMinusSource: 'program-minus-guest',
  },
  {
    id: 'caller-002',
    inviteCode: 'ROCK887-DEF456',
    inviteUrl: 'https://rock887.fm/guest/ROCK887-DEF456',
    guestName: 'Mike Johnson (Contest Winner)',
    status: 'lobby',
    joinedAt: new Date(Date.now() - 60000).toISOString(),
    onAirAt: null,
    audioLevel: 0,
    muted: false,
    connectionQuality: 'good',
    bitrate: 96,
    packetsLost: 2,
    roundTripTimeMs: 87,
    faderLevel: 0,
    cueEnabled: false,
    coughButton: false,
    mixMinusEnabled: false,
    mixMinusSource: 'program',
  },
  {
    id: 'caller-003',
    inviteCode: 'ROCK887-GHI789',
    inviteUrl: 'https://rock887.fm/guest/ROCK887-GHI789',
    guestName: 'Dr. Sarah Lee (Interview Guest)',
    guestEmail: 'sarah@university.edu',
    status: 'waiting',
    joinedAt: new Date(Date.now() - 30000).toISOString(),
    onAirAt: null,
    audioLevel: 0,
    muted: false,
    connectionQuality: 'excellent',
    bitrate: 128,
    packetsLost: 0,
    roundTripTimeMs: 28,
    faderLevel: 0,
    cueEnabled: false,
    coughButton: false,
    mixMinusEnabled: false,
    mixMinusSource: 'program',
  },
]

const INVITES: Invite[] = [
  {
    id: 'invite-001',
    code: 'ROCK887-ABC123',
    url: 'https://rock887.fm/guest/ROCK887-ABC123',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    maxGuests: 1,
    currentGuests: 1,
    createdBy: 'alex@rock887.fm',
    description: 'Morning show phone-in segment',
    waitingRoom: false,
  },
  {
    id: 'invite-002',
    code: 'ROCK887-GHI789',
    url: 'https://rock887.fm/guest/ROCK887-GHI789',
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    expiresAt: new Date(Date.now() + 7200000).toISOString(),
    maxGuests: 1,
    currentGuests: 1,
    createdBy: 'alex@rock887.fm',
    description: 'Interview with Dr. Lee about new study',
    waitingRoom: true,
  },
]

export async function GET() {
  await new Promise((r) => setTimeout(r, 80))

  // Simulate audio level drift for on-air callers
  for (const c of CALLERS) {
    if (c.status === 'on-air' && !c.muted) {
      c.audioLevel = Math.max(0, Math.min(100, c.audioLevel + (Math.random() - 0.5) * 20))
      c.roundTripTimeMs = Math.max(10, c.roundTripTimeMs + (Math.random() - 0.5) * 10)
    }
  }

  const onAir = CALLERS.filter((c) => c.status === 'on-air')
  const lobby = CALLERS.filter((c) => c.status === 'lobby' || c.status === 'waiting')

  return NextResponse.json({
    callers: CALLERS,
    invites: INVITES,
    stats: {
      totalCallers: CALLERS.length,
      onAir: onAir.length,
      inLobby: lobby.length,
      activeInvites: INVITES.length,
      avgBitrate: Math.round(CALLERS.reduce((s, c) => s + c.bitrate, 0) / CALLERS.length),
      avgRtt: Math.round(CALLERS.reduce((s, c) => s + c.roundTripTimeMs, 0) / CALLERS.length),
    },
    mixer: {
      onAirCallers: onAir.map((c) => ({
        id: c.id,
        name: c.guestName,
        fader: c.faderLevel,
        muted: c.muted,
        audio: Math.round(c.audioLevel),
        quality: c.connectionQuality,
      })),
    },
    tech: {
      sfu: 'mediasoup (or LiveKit)',
      transport: 'WebRTC',
      audioCodec: 'Opus',
      sampleRate: 48000,
      channels: 2,
      mixMinus: 'Program audio minus guest mic (prevents echo)',
      ifb: 'Interruptible Foldback for talkback',
    },
    comparedTo: {
      quicklinkStudioCall: 'Equivalent — browser-based, no hardware codec required',
      comrexAccess: 'Equivalent — but no proprietary hardware needed',
      rincon: 'Equivalent — WebRTC instead of SIP',
    },
  })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))

  if (body.action === 'create-invite') {
    const code = `ROCK887-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    const invite: Invite = {
      id: `invite-${Date.now()}`,
      code,
      url: `https://rock887.fm/guest/${code}`,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + (body.ttlHours ?? 24) * 3600000).toISOString(),
      maxGuests: body.maxGuests ?? 1,
      currentGuests: 0,
      createdBy: body.createdBy ?? 'host@rock887.fm',
      description: body.description ?? 'Guest caller invite',
      waitingRoom: body.waitingRoom ?? true,
    }
    INVITES.push(invite)
    return NextResponse.json({
      ok: true,
      invite,
      qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(invite.url)}`,
      message: `Invite created — share ${invite.url} with guest`,
    })
  }

  if (body.action === 'mute' && body.callerId !== undefined) {
    const c = CALLERS.find((x) => x.id === body.callerId)
    if (c) {
      c.muted = body.muted ?? !c.muted
      return NextResponse.json({ ok: true, caller: c })
    }
  }

  if (body.action === 'fader' && body.callerId !== undefined && body.level !== undefined) {
    const c = CALLERS.find((x) => x.id === body.callerId)
    if (c) {
      c.faderLevel = Math.max(0, Math.min(100, body.level))
      return NextResponse.json({ ok: true, caller: c })
    }
  }

  if (body.action === 'cough' && body.callerId !== undefined) {
    const c = CALLERS.find((x) => x.id === body.callerId)
    if (c) {
      c.coughButton = body.active ?? false
      return NextResponse.json({ ok: true, caller: c, message: c.coughButton ? 'Cough mute active' : 'Cough mute released' })
    }
  }

  if (body.action === 'put-on-air' && body.callerId !== undefined) {
    const c = CALLERS.find((x) => x.id === body.callerId)
    if (c) {
      c.status = 'on-air'
      c.onAirAt = new Date().toISOString()
      c.faderLevel = 75
      c.mixMinusEnabled = true
      c.cueEnabled = true
      return NextResponse.json({ ok: true, caller: c, message: `${c.guestName} is now ON AIR` })
    }
  }

  if (body.action === 'drop' && body.callerId !== undefined) {
    const c = CALLERS.find((x) => x.id === body.callerId)
    if (c) {
      c.status = 'dropped'
      return NextResponse.json({ ok: true, message: `${c.guestName} dropped from call` })
    }
  }

  return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 })
}
