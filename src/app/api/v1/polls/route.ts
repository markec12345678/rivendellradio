import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Live Polls + Real-Time Song Voting.
 *
 * Hosts can spin up a poll from the command palette (Cmd+K → "New Poll").
 * Listeners vote on a public page; results update live via socket.io.
 * Thumbs-up/down on the now-playing card feeds a rolling score into
 * AI Music Director's rotation weight for the next hour.
 *
 * GET  /api/v1/polls         — active polls + recent results
 * POST /api/v1/polls         — create a poll or cast a vote
 *
 * Poll types:
 *   - 'poll'        — multiple choice (host-created)
 *   - 'song-vote'   — thumbs up/down on currently playing track
 *   - 'request-vote' — vote on listener requests
 */

interface Poll {
  id: string
  type: 'poll' | 'song-vote' | 'request-vote'
  question: string
  options: { id: string; label: string; votes: number }[]
  createdAt: string
  closesAt: string
  status: 'active' | 'closed'
  totalVotes: number
  createdBy: string
  // For song-vote type
  trackId?: string
  trackTitle?: string
  trackArtist?: string
}

const POLLS: Poll[] = [
  {
    id: 'poll-001',
    type: 'song-vote',
    question: 'How do you like this track?',
    options: [
      { id: 'up', label: '👍 Love it', votes: 847 },
      { id: 'down', label: '👎 Skip it', votes: 42 },
    ],
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    closesAt: new Date(Date.now() + 1800000).toISOString(),
    status: 'active',
    totalVotes: 889,
    createdBy: 'system',
    trackId: 'trk-001',
    trackTitle: 'Seven Nation Army',
    trackArtist: 'The White Stripes',
  },
  {
    id: 'poll-002',
    type: 'poll',
    question: 'Which artist should we feature next week?',
    options: [
      { id: 'foofighters', label: 'Foo Fighters', votes: 412 },
      { id: 'nirvana', label: 'Nirvana', votes: 389 },
      { id: 'rhcp', label: 'Red Hot Chili Peppers', votes: 298 },
      { id: 'acdc', label: 'AC/DC', votes: 245 },
    ],
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    closesAt: new Date(Date.now() + 86400000).toISOString(),
    status: 'active',
    totalVotes: 1344,
    createdBy: 'alex@rock887.fm',
  },
  {
    id: 'poll-003',
    type: 'poll',
    question: "Best decade for rock music?",
    options: [
      { id: '70s', label: '1970s', votes: 567 },
      { id: '80s', label: '1980s', votes: 423 },
      { id: '90s', label: '1990s', votes: 891 },
      { id: '00s', label: '2000s', votes: 234 },
    ],
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    closesAt: new Date(Date.now() - 3600000).toISOString(),
    status: 'closed',
    totalVotes: 2115,
    createdBy: 'sara@rock887.fm',
  },
]

// Track rotation scores (feeds into AI Music Director)
const TRACK_SCORES: Record<string, { upvotes: number; downvotes: number; rollingScore: number }> = {
  'trk-001': { upvotes: 847, downvotes: 42, rollingScore: 0.95 },
  'trk-002': { upvotes: 623, downvotes: 18, rollingScore: 0.97 },
  'trk-003': { upvotes: 891, downvotes: 67, rollingScore: 0.93 },
}

export async function GET(req: Request) {
  await new Promise((r) => setTimeout(r, 80))
  const url = new URL(req.url)
  const active = url.searchParams.get('active') === 'true'

  let polls = [...POLLS].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  if (active) polls = polls.filter((p) => p.status === 'active')

  return NextResponse.json({
    count: polls.length,
    polls,
    activePolls: POLLS.filter((p) => p.status === 'active'),
    trackScores: TRACK_SCORES,
    stats: {
      totalPolls: POLLS.length,
      totalVotes: POLLS.reduce((s, p) => s + p.totalVotes, 0),
      avgVotesPerPoll: Math.round(POLLS.reduce((s, p) => s + p.totalVotes, 0) / POLLS.length),
      songVotesToday: 889,
    },
    aiIntegration: {
      description: 'Song-vote rolling scores feed into AI Music Director rotation weight',
      weightFormula: 'newRotationWeight = baseWeight * (0.5 + 0.5 * rollingScore)',
      updateFrequency: 'Every hour',
    },
    realtime: {
      transport: 'socket.io (port 3003)',
      event: 'poll:vote',
      endpoint: '/?XTransformPort=3003',
    },
  })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))

  // Create a poll
  if (body.action === 'create' || body.question) {
    const poll: Poll = {
      id: `poll-${Date.now()}`,
      type: body.type ?? 'poll',
      question: body.question,
      options: (body.options ?? ['Yes', 'No']).map((label: string, i: number) => ({
        id: `opt-${i}`,
        label,
        votes: 0,
      })),
      createdAt: new Date().toISOString(),
      closesAt: body.closesAt ?? new Date(Date.now() + 3600000).toISOString(),
      status: 'active',
      totalVotes: 0,
      createdBy: body.createdBy ?? 'host@rock887.fm',
      trackId: body.trackId,
      trackTitle: body.trackTitle,
      trackArtist: body.trackArtist,
    }
    POLLS.unshift(poll)
    return NextResponse.json({ ok: true, poll, message: 'Poll created — listeners can vote now' })
  }

  // Cast a vote
  if (body.action === 'vote' && body.pollId && body.optionId) {
    const poll = POLLS.find((p) => p.id === body.pollId)
    if (!poll) return NextResponse.json({ error: 'Poll not found' }, { status: 404 })
    if (poll.status === 'closed') return NextResponse.json({ error: 'Poll closed' }, { status: 400 })

    const option = poll.options.find((o) => o.id === body.optionId)
    if (!option) return NextResponse.json({ error: 'Option not found' }, { status: 404 })

    option.votes += 1
    poll.totalVotes += 1

    // If song-vote, update track rolling score
    if (poll.type === 'song-vote' && poll.trackId) {
      const score = TRACK_SCORES[poll.trackId] ?? { upvotes: 0, downvotes: 0, rollingScore: 0.5 }
      if (body.optionId === 'up') score.upvotes += 1
      if (body.optionId === 'down') score.downvotes += 1
      score.rollingScore = score.upvotes / Math.max(1, score.upvotes + score.downvotes)
      TRACK_SCORES[poll.trackId] = score
    }

    return NextResponse.json({
      ok: true,
      poll,
      option: option.id,
      totalVotes: poll.totalVotes,
    })
  }

  // Close a poll
  if (body.action === 'close' && body.pollId) {
    const poll = POLLS.find((p) => p.id === body.pollId)
    if (poll) {
      poll.status = 'closed'
      return NextResponse.json({ ok: true, poll, message: 'Poll closed' })
    }
  }

  return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 })
}
