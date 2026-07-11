import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Loyalty/Rewards + UGC (User-Generated Content) Portal.
 *
 * P1 (core listener) identification for sponsorship targeting.
 *   - Points for tune-in minutes, fulfilled requests, shares
 *   - Redeemable for shoutouts/picks/merch
 *   - Leaderboard
 *   - UGC upload portal (voice drops, shoutouts) → moderation queue
 *   - Smart request queue weighted by loyalty + artist fatigue
 *
 * GET  /api/v1/loyalty         — leaderboard + listener profiles + UGC queue
 * POST /api/v1/loyalty         — award points, redeem, submit UGC, moderate
 */

interface Listener {
  id: string
  name: string
  email?: string
  avatarColor: string
  joinedAt: string
  totalPoints: number
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond'
  // Activity stats
  tuneInMinutes: number
  requestsFulfilled: number
  requestsSubmitted: number
  sharesCount: number
  ugcSubmitted: number
  ugcApproved: number
  // Loyalty metrics
  consecutiveDays: number
  lastActiveAt: string
  // Redeemed rewards
  rewardsRedeemed: { id: string; name: string; cost: number; redeemedAt: string }[]
}

interface UgcSubmission {
  id: string
  listenerId: string
  listenerName: string
  type: 'voice-drop' | 'shoutout' | 'song-request-dedication' | 'audio-message'
  title: string
  description?: string
  audioUrl: string
  durationMs: number
  submittedAt: string
  status: 'pending' | 'approved' | 'rejected' | 'aired'
  moderatedBy?: string
  moderatedAt?: string
  airDate?: string
  rejectionReason?: string
  // Content moderation
  profanityFlagged: boolean
  autoTranscription?: string
}

interface Reward {
  id: string
  name: string
  description: string
  costPoints: number
  category: 'shoutout' | 'pick' | 'merch' | 'experience'
  available: boolean
  redeemedCount: number
}

const LISTENERS: Listener[] = [
  { id: 'lst-001', name: 'RockFan_42', email: 'fan42@example.com', avatarColor: '#ef4444', joinedAt: new Date(Date.now() - 365 * 86400000).toISOString(), totalPoints: 12450, tier: 'Diamond', tuneInMinutes: 87400, requestsFulfilled: 47, requestsSubmitted: 89, sharesCount: 234, ugcSubmitted: 12, ugcApproved: 8, consecutiveDays: 142, lastActiveAt: new Date(Date.now() - 300000).toISOString(), rewardsRedeemed: [{ id: 'rwd-001', name: 'Pick next song', cost: 500, redeemedAt: new Date(Date.now() - 86400000).toISOString() }] },
  { id: 'lst-002', name: 'MusicLover99', avatarColor: '#10b981', joinedAt: new Date(Date.now() - 180 * 86400000).toISOString(), totalPoints: 8230, tier: 'Platinum', tuneInMinutes: 41200, requestsFulfilled: 28, requestsSubmitted: 52, sharesCount: 87, ugcSubmitted: 5, ugcApproved: 3, consecutiveDays: 67, lastActiveAt: new Date(Date.now() - 600000).toISOString(), rewardsRedeemed: [] },
  { id: 'lst-003', name: 'JaneDoe', avatarColor: '#8b5cf6', joinedAt: new Date(Date.now() - 90 * 86400000).toISOString(), totalPoints: 4120, tier: 'Gold', tuneInMinutes: 18900, requestsFulfilled: 12, requestsSubmitted: 24, sharesCount: 41, ugcSubmitted: 2, ugcApproved: 1, consecutiveDays: 23, lastActiveAt: new Date(Date.now() - 1800000).toISOString(), rewardsRedeemed: [] },
  { id: 'lst-004', name: 'RockRadioFan', avatarColor: '#f59e0b', joinedAt: new Date(Date.now() - 30 * 86400000).toISOString(), totalPoints: 1450, tier: 'Silver', tuneInMinutes: 7200, requestsFulfilled: 5, requestsSubmitted: 11, sharesCount: 14, ugcSubmitted: 1, ugcApproved: 0, consecutiveDays: 8, lastActiveAt: new Date(Date.now() - 3600000).toISOString(), rewardsRedeemed: [] },
  { id: 'lst-005', name: 'NewListener', avatarColor: '#3b82f6', joinedAt: new Date(Date.now() - 7 * 86400000).toISOString(), totalPoints: 320, tier: 'Bronze', tuneInMinutes: 840, requestsFulfilled: 1, requestsSubmitted: 3, sharesCount: 2, ugcSubmitted: 0, ugcApproved: 0, consecutiveDays: 3, lastActiveAt: new Date(Date.now() - 7200000).toISOString(), rewardsRedeemed: [] },
]

const UGC_QUEUE: UgcSubmission[] = [
  { id: 'ugc-001', listenerId: 'lst-001', listenerName: 'RockFan_42', type: 'voice-drop', title: 'Morning show intro drop', description: 'Hey Rock 88.7, rise and shine!', audioUrl: 's3://rock887-ugc/ugc-001.wav', durationMs: 4200, submittedAt: new Date(Date.now() - 3600000).toISOString(), status: 'pending', profanityFlagged: false, autoTranscription: 'Hey Rock 88.7, rise and shine!' },
  { id: 'ugc-002', listenerId: 'lst-002', listenerName: 'MusicLover99', type: 'shoutout', title: 'Birthday shoutout for mom', description: 'Happy 60th birthday mom!', audioUrl: 's3://rock887-ugc/ugc-002.wav', durationMs: 8200, submittedAt: new Date(Date.now() - 7200000).toISOString(), status: 'approved', moderatedBy: 'alex@rock887.fm', moderatedAt: new Date(Date.now() - 6600000).toISOString(), airDate: new Date(Date.now() + 3600000).toISOString(), profanityFlagged: false, autoTranscription: 'Happy 60th birthday mom, love you!' },
  { id: 'ugc-003', listenerId: 'lst-003', listenerName: 'JaneDoe', type: 'song-request-dedication', title: 'Everlong for my husband', description: 'Our first dance song', audioUrl: 's3://rock887-ugc/ugc-003.wav', durationMs: 6100, submittedAt: new Date(Date.now() - 86400000).toISOString(), status: 'aired', moderatedBy: 'alex@rock887.fm', moderatedAt: new Date(Date.now() - 82800000).toISOString(), airDate: new Date(Date.now() - 79200000).toISOString(), profanityFlagged: false, autoTranscription: 'This is for my husband, our first dance was Everlong.' },
]

const REWARDS: Reward[] = [
  { id: 'rwd-001', name: 'Pick next song', description: 'Choose the next track to play on-air', costPoints: 500, category: 'pick', available: true, redeemedCount: 47 },
  { id: 'rwd-002', name: 'On-air shoutout', description: 'DJ will give you a shoutout on-air', costPoints: 250, category: 'shoutout', available: true, redeemedCount: 128 },
  { id: 'rwd-003', name: 'Rock 88.7 t-shirt', description: 'Official station merch', costPoints: 2000, category: 'merch', available: true, redeemedCount: 23 },
  { id: 'rwd-004', name: 'Studio tour', description: 'Visit the Rock 88.7 studio', costPoints: 5000, category: 'experience', available: true, redeemedCount: 4 },
  { id: 'rwd-005', name: 'Guest DJ for 1 hour', description: 'Co-host a hour with Alex Morgan', costPoints: 10000, category: 'experience', available: false, redeemedCount: 1 },
]

const TIER_THRESHOLDS = { Bronze: 0, Silver: 1000, Gold: 3000, Platinum: 7000, Diamond: 10000 }

function getTier(points: number): Listener['tier'] {
  if (points >= 10000) return 'Diamond'
  if (points >= 7000) return 'Platinum'
  if (points >= 3000) return 'Gold'
  if (points >= 1000) return 'Silver'
  return 'Bronze'
}

export async function GET() {
  await new Promise((r) => setTimeout(r, 80))

  const leaderboard = [...LISTENERS].sort((a, b) => b.totalPoints - a.totalPoints)
  const pendingUgc = UGC_QUEUE.filter((u) => u.status === 'pending')

  return NextResponse.json({
    leaderboard,
    listenerCount: LISTENERS.length,
    totalListeners: 8472,
    totalPointsAwarded: 1247583,
    tierDistribution: Object.entries(TIER_THRESHOLDS).reduce<Record<string, number>>((acc, [tier]) => {
      acc[tier] = LISTENERS.filter((l) => l.tier === tier).length
      return acc
    }, {}),
    ugcQueue: UGC_QUEUE,
    pendingUgcCount: pendingUgc.length,
    rewards: REWARDS,
    tierThresholds: TIER_THRESHOLDS,
    pointsEconomy: {
      tuneInPerMinute: 1,
      requestFulfilled: 50,
      requestSubmitted: 5,
      share: 10,
      ugcApproved: 100,
      dailyStreak: 25,
      consecutive7days: 200,
    },
    aiIntegration: {
      smartRequestQueue: 'Requests weighted by listener loyalty + AI Music Director artist fatigue index',
      weightFormula: 'requestPriority = (loyaltyTier * 0.4) + (artistFatigueScore * 0.4) + (requestAge * 0.2)',
      p1Identification: 'P1 (core) listeners = Diamond/Platinum tier — targeted for sponsorship surveys',
    },
    compliance: {
      gdpr: 'Listener data stored per consent, right to erasure via /api/v1/loyalty/delete',
      coppa: 'Age gate on signup (13+)',
      dataRetention: '2 years inactivity → anonymized',
    },
  })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))

  if (body.action === 'award-points' && body.listenerId && body.amount) {
    const l = LISTENERS.find((x) => x.id === body.listenerId)
    if (l) {
      l.totalPoints += body.amount
      l.tier = getTier(l.totalPoints)
      return NextResponse.json({ ok: true, listener: l, message: `Awarded ${body.amount} points to ${l.name}` })
    }
  }

  if (body.action === 'redeem' && body.listenerId && body.rewardId) {
    const l = LISTENERS.find((x) => x.id === body.listenerId)
    const r = REWARDS.find((x) => x.id === body.rewardId)
    if (!l || !r) return NextResponse.json({ ok: false, error: 'Listener or reward not found' }, { status: 404 })
    if (l.totalPoints < r.costPoints) return NextResponse.json({ ok: false, error: 'Insufficient points' }, { status: 400 })
    l.totalPoints -= r.costPoints
    l.tier = getTier(l.totalPoints)
    l.rewardsRedeemed.push({ id: r.id, name: r.name, cost: r.costPoints, redeemedAt: new Date().toISOString() })
    r.redeemedCount += 1
    return NextResponse.json({ ok: true, listener: l, reward: r, message: `${l.name} redeemed "${r.name}" for ${r.costPoints} points` })
  }

  if (body.action === 'submit-ugc') {
    const l = LISTENERS.find((x) => x.id === body.listenerId)
    if (!l) return NextResponse.json({ ok: false, error: 'Listener not found' }, { status: 404 })
    const ugc: UgcSubmission = {
      id: `ugc-${Date.now()}`,
      listenerId: body.listenerId,
      listenerName: l.name,
      type: body.type ?? 'voice-drop',
      title: body.title ?? 'Untitled',
      description: body.description,
      audioUrl: body.audioUrl ?? `s3://rock887-ugc/ugc-${Date.now()}.wav`,
      durationMs: body.durationMs ?? 5000,
      submittedAt: new Date().toISOString(),
      status: 'pending',
      profanityFlagged: body.profanityFlagged ?? false,
      autoTranscription: body.transcription,
    }
    UGC_QUEUE.unshift(ugc)
    l.ugcSubmitted += 1
    return NextResponse.json({ ok: true, ugc, message: 'UGC submitted — pending moderator review' })
  }

  if (body.action === 'moderate-ugc' && body.ugcId) {
    const u = UGC_QUEUE.find((x) => x.id === body.ugcId)
    if (u) {
      u.status = body.status // approved | rejected | aired
      u.moderatedBy = body.moderatorId ?? 'host@rock887.fm'
      u.moderatedAt = new Date().toISOString()
      u.rejectionReason = body.rejectionReason
      if (body.status === 'approved' || body.status === 'aired') {
        const l = LISTENERS.find((x) => x.id === u.listenerId)
        if (l) {
          l.ugcApproved += 1
          l.totalPoints += 100
          l.tier = getTier(l.totalPoints)
        }
      }
      return NextResponse.json({ ok: true, ugc: u })
    }
  }

  return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 })
}
