import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface CopilotResponse {
  answer: string
  sources: Array<{ type: string; detail: string }>
  confidence: 'high' | 'medium' | 'low'
  followUpQuestions: string[]
  relatedIncidents?: string[]
}

const knowledgeBase: Record<string, CopilotResponse> = {
  'stream fell': {
    answer: 'Stream has not fallen in the last 24 hours. All 3 streams (Main FM, Web HD, Mobile) are currently online with 1,788 total listeners. The last stream-related incident was a Discord webhook rate limit at 14:30 (auto-recovered in 5 minutes). If you are experiencing issues, check: 1) Your internet connection, 2) Icecast2 server (192.168.20.1) — SNMP shows it healthy with 23% CPU, 3) Network path to stream server.',
    sources: [
      { type: 'snmp', detail: 'Icecast2 Server: online, 1788 listeners, 342 Mbps bandwidth, 23% CPU' },
      { type: 'incidents', detail: 'Last stream incident: webhook rate limit (14:30, resolved 14:35)' },
      { type: 'event_bus', detail: 'stream.listeners.changed events flowing normally (1s interval)' },
    ],
    confidence: 'high',
    followUpQuestions: ['Show me listener trends for today', 'What is the Icecast2 server bandwidth?', 'Are there any pending webhook failures?'],
  },
  'why is cpu high': {
    answer: 'The DAB+ Multiplexer is showing elevated CPU at 67% (normal: 30-40%). AI Root Cause analysis indicates this is due to the scheduled firmware update that activated the backup transcoder. The error rate has also increased slightly (0.003% vs normal 0.001%). This is a known behavior during firmware updates and should resolve within 15-20 minutes. No action is required — the system is operating within safe parameters.',
    sources: [
      { type: 'snmp', detail: 'DAB+ Mux: CPU 67%, error rate 0.003%, bitrate 96kbps stable' },
      { type: 'ai_analysis', detail: 'AI Failure Detection: firmware update correlation identified' },
      { type: 'incidents', detail: 'Incident inc-001: DAB+ Error Rate Spike (acknowledged, AI-analyzed)' },
    ],
    confidence: 'high',
    followUpQuestions: ['When will the firmware update finish?', 'Should I switch to the backup encoder?', 'Show me the DAB+ error rate history'],
    relatedIncidents: ['inc-001', 'inc-002'],
  },
  'rds not updating': {
    answer: 'RDS is updating correctly. The last RDS update was 3 seconds ago, with PI=887F, PS=ROCK887, PTY=11 (Rock music). The RDS encoder (Inovonics 730 at 192.168.50.10) is online and responding to SNMP queries. If you are seeing stale RDS on a specific receiver, try: 1) Re-tuning the receiver, 2) Checking the PI code matches (887F), 3) Verifying the RDS signal strength in your area.',
    sources: [
      { type: 'snmp', detail: 'RDS Encoder: online, PI=887F, PS=ROCK887, signal=Active' },
      { type: 'event_bus', detail: 'rds.updated events flowing (cascading from track.started)' },
      { type: 'rds_api', detail: 'GET /api/v1/rds: encoderConnected=true, lastUpdate=3s ago' },
    ],
    confidence: 'high',
    followUpQuestions: ['What is the current RadioText?', 'Show me RDS target delivery status', 'How do I reset the RDS encoder?'],
  },
  'listeners dropping': {
    answer: 'Listener count is stable at 1,788 (Main FM: 1,287, Web HD: 412, Mobile: 89). No significant drop detected in the last hour. The largest drop today was 12 listeners at 13:42 (correlated with a brief network hiccup — auto-recovered in 30 seconds). If you are seeing a drop on a specific platform, check the stream server health and bandwidth utilization (currently 342 Mbps — well within capacity).',
    sources: [
      { type: 'snmp', detail: 'Icecast2: 1788 listeners, 342 Mbps, 3 mountpoints, 23% CPU' },
      { type: 'event_bus', detail: 'stream.listeners.changed events: normal fluctuation (±5/min)' },
      { type: 'reports', detail: '24h listener chart: peak 2,531, average 1,548, current 1,788' },
    ],
    confidence: 'high',
    followUpQuestions: ['Show me the 24h listener chart', 'What was the peak listener count today?', 'Which stream has the most listeners?'],
  },
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const query = (body.query ?? '').toLowerCase().trim()

  if (!query) {
    return NextResponse.json({ error: 'Query required' }, { status: 400 })
  }

  await new Promise((r) => setTimeout(r, 500)) // Simulate AI thinking

  // Match against knowledge base
  let bestMatch: CopilotResponse | null = null
  let bestScore = 0

  for (const [key, response] of Object.entries(knowledgeBase)) {
    const keywords = key.split(' ')
    let score = 0
    for (const kw of keywords) {
      if (query.includes(kw)) score++
    }
    // Also check if query words appear in the key
    const queryWords = query.split(' ')
    for (const qw of queryWords) {
      if (qw.length > 2 && key.includes(qw)) score += 0.5
    }
    if (score > bestScore) {
      bestScore = score
      bestMatch = response
    }
  }

  if (bestMatch && bestScore > 0) {
    return NextResponse.json({
      query,
      ...bestMatch,
      executionMs: 500,
      tokensUsed: 320,
    })
  }

  // Default response — AI couldn't find specific answer
  return NextResponse.json({
    query,
    answer: `I analyzed the system state but couldn't find a specific answer to "${body.query}". Current system status: all 3 streams online (1,788 listeners), 5/6 daemons running, RDS active, no critical alerts. Try asking about: stream status, CPU usage, RDS updates, listener counts, or recent incidents.`,
    sources: [
      { type: 'system', detail: '5/6 daemons running, 0 critical alerts' },
      { type: 'snmp', detail: 'All monitored devices online (1 warning: DAB+ mux)' },
    ],
    confidence: 'low',
    followUpQuestions: [
      'Why is CPU high?',
      'Did the stream fall?',
      'Is RDS updating?',
      'Are listeners dropping?',
      'Show recent incidents',
    ],
    executionMs: 500,
    tokensUsed: 180,
  })
}
