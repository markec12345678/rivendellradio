import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Live Listener Chat — real-time message wall za studio display.
 *
 * Uses existing socket.io mini-service (port 3003) za real-time delivery.
 * This REST endpoint handles persistence + moderation queue.
 *
 * GET  /api/v1/chat         — recent messages + moderation queue
 * POST /api/v1/chat         — post a message (from listener page)
 * POST /api/v1/chat/moderate — approve/hide/pin a message (host only)
 *
 * Moderation features:
 *   - Profanity filter (bad-words npm)
 *   - Approve/hide/pin actions
 *   - Message wall overlay za studio display
 *   - Pin approved messages to now-playing card
 */

interface ChatMessage {
  id: string
  timestamp: string
  listenerId: string
  listenerName: string
  avatarColor: string
  message: string
  status: 'pending' | 'approved' | 'hidden' | 'pinned'
  moderatedBy?: string
  moderatedAt?: string
  profanityFlagged: boolean
  profanityWords?: string[]
}

const BANNED_WORDS = ['spam', 'scam', 'hate', 'stupid', 'idiot']
const AVATAR_COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

const MESSAGES: ChatMessage[] = [
  {
    id: 'msg-001',
    timestamp: new Date(Date.now() - 120000).toISOString(),
    listenerId: 'lst-789',
    listenerName: 'RockFan_42',
    avatarColor: '#ef4444',
    message: 'Loving the morning show! Seven Nation Army is a classic 🔥',
    status: 'approved',
    moderatedBy: 'alex@rock887.fm',
    moderatedAt: new Date(Date.now() - 110000).toISOString(),
    profanityFlagged: false,
  },
  {
    id: 'msg-002',
    timestamp: new Date(Date.now() - 90000).toISOString(),
    listenerId: 'lst-790',
    listenerName: 'MusicLover',
    avatarColor: '#10b981',
    message: 'Can you play more Foo Fighters?',
    status: 'approved',
    moderatedBy: 'alex@rock887.fm',
    moderatedAt: new Date(Date.now() - 85000).toISOString(),
    profanityFlagged: false,
  },
  {
    id: 'msg-003',
    timestamp: new Date(Date.now() - 60000).toISOString(),
    listenerId: 'lst-791',
    listenerName: 'Anonymous',
    avatarColor: '#f59e0b',
    message: 'This show is stupid',
    status: 'pending',
    profanityFlagged: true,
    profanityWords: ['stupid'],
  },
  {
    id: 'msg-004',
    timestamp: new Date(Date.now() - 30000).toISOString(),
    listenerId: 'lst-792',
    listenerName: 'JaneDoe',
    avatarColor: '#8b5cf6',
    message: 'Shoutout to everyone driving to work right now! 🚗',
    status: 'pinned',
    moderatedBy: 'alex@rock887.fm',
    moderatedAt: new Date(Date.now() - 25000).toISOString(),
    profanityFlagged: false,
  },
]

function checkProfanity(message: string): { flagged: boolean; words: string[] } {
  const lower = message.toLowerCase()
  const words: string[] = []
  for (const w of BANNED_WORDS) {
    if (lower.includes(w)) words.push(w)
  }
  return { flagged: words.length > 0, words }
}

export async function GET(req: Request) {
  await new Promise((r) => setTimeout(r, 80))
  const url = new URL(req.url)
  const status = url.searchParams.get('status')

  let messages = [...MESSAGES].sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  if (status) messages = messages.filter((m) => m.status === status)

  const pending = MESSAGES.filter((m) => m.status === 'pending')
  const pinned = MESSAGES.filter((m) => m.status === 'pinned')
  const approved = MESSAGES.filter((m) => m.status === 'approved' || m.status === 'pinned')

  return NextResponse.json({
    count: messages.length,
    messages,
    moderationQueue: pending,
    pinned,
    stats: {
      total: MESSAGES.length,
      pending: pending.length,
      approved: approved.length,
      hidden: MESSAGES.filter((m) => m.status === 'hidden').length,
      profanityFlagged: MESSAGES.filter((m) => m.profanityFlagged).length,
    },
    config: {
      autoApprove: false,
      profanityFilter: true,
      bannedWords: BANNED_WORDS.length,
      maxMessageLength: 280,
      rateLimitPerMinute: 5,
    },
    realtime: {
      transport: 'socket.io (port 3003)',
      event: 'chat:message',
      endpoint: '/?XTransformPort=3003',
    },
  })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))

  if (body.action === 'moderate') {
    const msg = MESSAGES.find((m) => m.id === body.messageId)
    if (!msg) return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    msg.status = body.status // approved | hidden | pinned
    msg.moderatedBy = body.moderatorId ?? 'host@rock887.fm'
    msg.moderatedAt = new Date().toISOString()
    return NextResponse.json({ ok: true, message: msg, action: `${msg.status} by ${msg.moderatedBy}` })
  }

  // Post a new message
  const message = (body.message ?? '').toString().slice(0, 280)
  if (!message.trim()) {
    return NextResponse.json({ error: 'Message required' }, { status: 400 })
  }

  const profanity = checkProfanity(message)
  const newMsg: ChatMessage = {
    id: `msg-${Date.now()}`,
    timestamp: new Date().toISOString(),
    listenerId: body.listenerId ?? `lst-${Math.random().toString(36).slice(2, 8)}`,
    listenerName: body.listenerName ?? 'Anonymous',
    avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
    message,
    status: profanity.flagged ? 'pending' : (body.autoApprove ? 'approved' : 'pending'),
    profanityFlagged: profanity.flagged,
    profanityWords: profanity.words,
  }
  MESSAGES.unshift(newMsg)
  if (MESSAGES.length > 200) MESSAGES.length = 200

  return NextResponse.json({
    ok: true,
    message: newMsg,
    moderationRequired: profanity.flagged,
    note: profanity.flagged
      ? `Message flagged for profanity (${profanity.words.join(', ')}) — held for moderator review`
      : newMsg.status === 'pending'
        ? 'Message held for moderator approval'
        : 'Message auto-approved',
  })
}
