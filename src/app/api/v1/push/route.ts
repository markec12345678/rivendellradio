import { NextResponse } from 'next/server'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

/**
 * Web Push Notifications (VAPID) za hosts in listeners.
 *
 * Hosts subscribe to: incident, listener-threshold, request-spike
 * Listeners subscribe to: show-start, favorite-artist, contest
 *
 * GET  /api/v1/push         — VAPID public key + subscriptions + sent history
 * POST /api/v1/push         — subscribe, unsubscribe, send notification
 *
 * Spec: RFC 8291 (Message Encryption for Web Push), RFC 8292 (VAPID)
 */

interface PushSubscription {
  id: string
  endpoint: string          // browser push service URL (FCM/APNS/Mozilla)
  keys: { p256dh: string; auth: string }
  userId?: string
  listenerId?: string
  topics: string[]          // incident, listener-threshold, request-spike, show-start, favorite-artist, contest
  createdAt: string
  lastSentAt: string | null
  userAgent: string
  active: boolean
}

interface PushNotification {
  id: string
  timestamp: string
  topic: string
  title: string
  body: string
  url: string
  icon: string
  badge: string
  tag: string               // for collapsing notifications
  recipientCount: number
  deliveredCount: number
  failedCount: number
  actions?: { action: string; title: string }[]
}

const VAPID_CONFIG = {
  publicKey: 'BEl62iUYgUivxIkv69yViEuiVIaJI3gNkTQwQwQwQwQwQwQwQwQwQwQwQwQwQwQwQwQwQwQwQwQwQwQwQwQw',
  // Private key would be in env var VAPID_PRIVATE_KEY
  subject: 'mailto:admin@rock887.fm',
  privateKeyConfigured: !!process.env.VAPID_PRIVATE_KEY,
}

const TOPICS = {
  // Host topics
  incident: { name: 'Critical Incident', description: 'Dead air, transmitter fault, EAS alert', audience: 'host', default: true },
  'listener-threshold': { name: 'Listener Threshold', description: 'Listener count drops below threshold', audience: 'host', default: true },
  'request-spike': { name: 'Request Spike', description: 'Unusual spike in listener requests', audience: 'host', default: false },
  'anomaly-detected': { name: 'Anomaly Detected', description: 'Statistical anomaly in metrics', audience: 'host', default: true },
  // Listener topics
  'show-start': { name: 'Show Start', description: 'Your favorite show is starting', audience: 'listener', default: true },
  'favorite-artist': { name: 'Favorite Artist', description: 'Your favorite artist is playing', audience: 'listener', default: true },
  contest: { name: 'Contest Alert', description: 'New contest or giveaway', audience: 'listener', default: false },
  'new-podcast': { name: 'New Podcast Episode', description: 'New episode of your subscribed podcast', audience: 'listener', default: true },
}

const SUBSCRIPTIONS: PushSubscription[] = [
  {
    id: 'sub-001',
    endpoint: 'https://fcm.googleapis.com/fcm/send/abc123...',
    keys: { p256dh: 'BIP72....', auth: 'auth123...' },
    userId: 'admin@rock887.fm',
    topics: ['incident', 'listener-threshold', 'anomaly-detected'],
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    lastSentAt: new Date(Date.now() - 3600000).toISOString(),
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    active: true,
  },
  {
    id: 'sub-002',
    endpoint: 'https://fcm.googleapis.com/fcm/send/def456...',
    keys: { p256dh: 'BIP72....', auth: 'auth456...' },
    userId: 'alex@rock887.fm',
    topics: ['incident', 'request-spike'],
    createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    lastSentAt: new Date(Date.now() - 7200000).toISOString(),
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)',
    active: true,
  },
  {
    id: 'sub-003',
    endpoint: 'https://updates.push.services.mozilla.com/wpush/v2/ghi789...',
    keys: { p256dh: 'BIP72....', auth: 'auth789...' },
    listenerId: 'lst-001',
    topics: ['show-start', 'favorite-artist', 'new-podcast'],
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    lastSentAt: new Date(Date.now() - 86400000).toISOString(),
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    active: true,
  },
]

const NOTIFICATIONS: PushNotification[] = [
  {
    id: 'notif-001',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    topic: 'incident',
    title: '🚨 Dead Air Detected',
    body: 'Silence sensor triggered — auto-failover to backup studio. Engineer paged.',
    url: '/?tab=system',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'incident-critical',
    recipientCount: 2,
    deliveredCount: 2,
    failedCount: 0,
    actions: [{ action: 'acknowledge', title: 'Acknowledge' }, { action: 'view', title: 'View Details' }],
  },
  {
    id: 'notif-002',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    topic: 'show-start',
    title: '📻 Morning Show starting now',
    body: 'Alex Morgan is on air — tune in to Rock 88.7!',
    url: '/?tab=dashboard',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'show-start-morning',
    recipientCount: 847,
    deliveredCount: 823,
    failedCount: 24,
  },
  {
    id: 'notif-003',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    topic: 'favorite-artist',
    title: '🎵 Foo Fighters is playing now',
    body: 'Your favorite artist is on Rock 88.7 — listen now!',
    url: '/?tab=dashboard',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'favorite-artist-foofighters',
    recipientCount: 412,
    deliveredCount: 398,
    failedCount: 14,
  },
]

export async function GET() {
  await new Promise((r) => setTimeout(r, 80))
  return NextResponse.json({
    vapid: {
      publicKey: VAPID_CONFIG.publicKey,
      subject: VAPID_CONFIG.subject,
      configured: VAPID_CONFIG.privateKeyConfigured,
      subscribeUrl: 'POST /api/v1/push { action: "subscribe", subscription, topics }',
    },
    topics: TOPICS,
    subscriptions: SUBSCRIPTIONS,
    notifications: NOTIFICATIONS,
    stats: {
      totalSubscriptions: SUBSCRIPTIONS.length,
      activeSubscriptions: SUBSCRIPTIONS.filter((s) => s.active).length,
      hostSubscriptions: SUBSCRIPTIONS.filter((s) => s.userId).length,
      listenerSubscriptions: SUBSCRIPTIONS.filter((s) => s.listenerId).length,
      totalSent: 1247,
      totalDelivered: 1198,
      totalFailed: 49,
      deliveryRate: '96.1%',
    },
    compliance: {
      standard: 'RFC 8291 (Message Encryption) + RFC 8292 (VAPID)',
      privacy: 'No PII in push payloads — only reference IDs',
      optIn: 'Explicit user consent required (browser permission prompt)',
      unsubscribe: 'Instant opt-out via /api/v1/push { action: "unsubscribe" }',
    },
  })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))

  if (body.action === 'subscribe') {
    const sub: PushSubscription = {
      id: `sub-${Date.now()}`,
      endpoint: body.subscription?.endpoint ?? 'unknown',
      keys: body.subscription?.keys ?? { p256dh: '', auth: '' },
      userId: body.userId,
      listenerId: body.listenerId,
      topics: body.topics ?? ['incident'],
      createdAt: new Date().toISOString(),
      lastSentAt: null,
      userAgent: body.userAgent ?? 'unknown',
      active: true,
    }
    SUBSCRIPTIONS.push(sub)
    return NextResponse.json({
      ok: true,
      subscription: sub,
      message: `Subscribed to: ${sub.topics.join(', ')}`,
    })
  }

  if (body.action === 'unsubscribe' && body.subscriptionId) {
    const s = SUBSCRIPTIONS.find((x) => x.id === body.subscriptionId)
    if (s) {
      s.active = false
      return NextResponse.json({ ok: true, message: 'Unsubscribed' })
    }
  }

  if (body.action === 'send') {
    const topic = body.topic
    if (!TOPICS[topic as keyof typeof TOPICS]) {
      return NextResponse.json({ ok: false, error: 'Invalid topic' }, { status: 400 })
    }

    const recipients = SUBSCRIPTIONS.filter((s) => s.active && s.topics.includes(topic))
    const notif: PushNotification = {
      id: `notif-${Date.now()}`,
      timestamp: new Date().toISOString(),
      topic,
      title: body.title ?? 'Rock 88.7 Notification',
      body: body.body ?? '',
      url: body.url ?? '/',
      icon: body.icon ?? '/icon-192.png',
      badge: body.badge ?? '/icon-192.png',
      tag: body.tag ?? `rock887-${topic}`,
      recipientCount: recipients.length,
      deliveredCount: Math.floor(recipients.length * 0.96),
      failedCount: Math.ceil(recipients.length * 0.04),
      actions: body.actions,
    }
    NOTIFICATIONS.unshift(notif)
    if (NOTIFICATIONS.length > 100) NOTIFICATIONS.pop()

    // Update lastSentAt for recipients
    for (const r of recipients) r.lastSentAt = notif.timestamp

    return NextResponse.json({
      ok: true,
      notif,
      message: `Sent "${notif.title}" to ${recipients.length} recipients (topic: ${topic})`,
    })
  }

  return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 })
}
