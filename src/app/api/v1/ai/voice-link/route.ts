import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * AI Voice Link / Sweeper Generator + Multilingual AI News.
 *
 * #D2: Multilingual AI news bulletins (29-language ElevenLabs)
 * #D3: Context-aware voice link generator (radio.co Voice Studio pattern)
 *
 * GET /api/v1/ai/voice-link         — recent voice links + multilingual news schedule
 * POST /api/v1/ai/voice-link         — generate voice link or multilingual news
 *
 * Voice link: reads outgoing+incoming track metadata and synthesizes a context-aware
 * link ("That was [Artist] with [Song] — coming up, [NextSong] on Rock 88.7").
 *
 * Multilingual news: localized bulletins in up to 5 languages, rotated by daypart
 * (e.g., Spanish bulletin at 18:00 for Hispanic daypart).
 */

interface VoiceLink {
  id: string
  timestamp: string
  type: 'voice-link' | 'sweeper' | 'station-id' | 'time-check'
  outgoingTrack: { title: string; artist: string }
  incomingTrack: { title: string; artist: string }
  script: string
  audioUrl: string
  durationMs: number
  voiceId: string
  voiceName: string
  language: string
  mixedWithCrossfade: boolean
  scheduledAt: string
  status: 'generated' | 'scheduled' | 'aired'
}

interface MultilingualNewsSchedule {
  language: string
  languageCode: string
  scheduledAt: string  // HH:MM
  dayparts: string[]
  pronunciationDictionary: { word: string; ipa: string }[]
  lastBulletin: string | null
  bulletinsToday: number
}

const VOICE_LINKS: VoiceLink[] = [
  { id: 'vl-001', timestamp: new Date(Date.now() - 300000).toISOString(), type: 'voice-link', outgoingTrack: { title: 'Seven Nation Army', artist: 'The White Stripes' }, incomingTrack: { title: 'Everlong', artist: 'Foo Fighters' }, script: 'That was Seven Nation Army by The White Stripes — coming up, Foo Fighters with Everlong on Rock 88.7.', audioUrl: 's3://rock887-voice-links/vl-001.wav', durationMs: 8500, voiceId: 'voice-001', voiceName: 'Rock Voice — Alex', language: 'en-US', mixedWithCrossfade: true, scheduledAt: new Date(Date.now() + 60000).toISOString(), status: 'scheduled' },
  { id: 'vl-002', timestamp: new Date(Date.now() - 900000).toISOString(), type: 'time-check', outgoingTrack: { title: 'Black Hole Sun', artist: 'Soundgarden' }, incomingTrack: { title: 'Wonderwall', artist: 'Oasis' }, script: "It's 10:30 — you're listening to Rock 88.7 FM. Up next, Oasis with Wonderwall.", audioUrl: 's3://rock887-voice-links/vl-002.wav', durationMs: 6200, voiceId: 'voice-001', voiceName: 'Rock Voice — Alex', language: 'en-US', mixedWithCrossfade: true, scheduledAt: new Date(Date.now() - 600000).toISOString(), status: 'aired' },
  { id: 'vl-003', timestamp: new Date(Date.now() - 1800000).toISOString(), type: 'sweeper', outgoingTrack: { title: 'Thunderstruck', artist: 'AC/DC' }, incomingTrack: { title: 'Smells Like Teen Spirit', artist: 'Nirvana' }, script: 'Rock 88.7 — the best rock of all time. That was AC/DC, and now Nirvana takes over.', audioUrl: 's3://rock887-voice-links/vl-003.wav', durationMs: 7200, voiceId: 'voice-001', voiceName: 'Rock Voice — Alex', language: 'en-US', mixedWithCrossfade: true, scheduledAt: new Date(Date.now() - 1500000).toISOString(), status: 'aired' },
]

const MULTILINGUAL_SCHEDULE: MultilingualNewsSchedule[] = [
  { language: 'English', languageCode: 'en-US', scheduledAt: '06:00', dayparts: ['morning-drive'], pronunciationDictionary: [{ word: 'Ljubljana', ipa: 'loob-lyah-nah' }], lastBulletin: new Date(Date.now() - 3600000).toISOString(), bulletinsToday: 6 },
  { language: 'Spanish', languageCode: 'es-ES', scheduledAt: '18:00', dayparts: ['afternoon-drive'], pronunciationDictionary: [{ word: 'Ljubljana', ipa: 'loo-blee-yah-nah' }], lastBulletin: new Date(Date.now() - 7200000).toISOString(), bulletinsToday: 2 },
  { language: 'German', languageCode: 'de-DE', scheduledAt: '12:00', dayparts: ['midday'], pronunciationDictionary: [{ word: 'Ljubljana', ipa: 'loob-lyah-nah' }], lastBulletin: new Date(Date.now() - 86400000).toISOString(), bulletinsToday: 1 },
  { language: 'Italian', languageCode: 'it-IT', scheduledAt: '20:00', dayparts: ['evening'], pronunciationDictionary: [{ word: 'Ljubljana', ipa: 'lyoo-blee-ah-nah' }], lastBulletin: null, bulletinsToday: 0 },
  { language: 'French', languageCode: 'fr-FR', scheduledAt: '07:00', dayparts: ['morning-drive'], pronunciationDictionary: [{ word: 'Ljubljana', ipa: 'lyoo-blee-yah-nah' }], lastBulletin: null, bulletinsToday: 0 },
]

const SUPPORTED_LANGUAGES = [
  { code: 'en-US', name: 'English', elevenLabsVoice: 'eleven_multilingual_v2' },
  { code: 'es-ES', name: 'Spanish', elevenLabsVoice: 'eleven_multilingual_v2' },
  { code: 'de-DE', name: 'German', elevenLabsVoice: 'eleven_multilingual_v2' },
  { code: 'it-IT', name: 'Italian', elevenLabsVoice: 'eleven_multilingual_v2' },
  { code: 'fr-FR', name: 'French', elevenLabsVoice: 'eleven_multilingual_v2' },
  { code: 'sl-SI', name: 'Slovenian', elevenLabsVoice: 'eleven_multilingual_v2' },
  { code: 'hr-HR', name: 'Croatian', elevenLabsVoice: 'eleven_multilingual_v2' },
  { code: 'sr-RS', name: 'Serbian', elevenLabsVoice: 'eleven_multilingual_v2' },
]

export async function GET() {
  await new Promise((r) => setTimeout(r, 80))
  return NextResponse.json({
    voiceLinks: VOICE_LINKS,
    multilingualSchedule: MULTILINGUAL_SCHEDULE,
    supportedLanguages: SUPPORTED_LANGUAGES,
    stats: {
      totalVoiceLinks: VOICE_LINKS.length,
      scheduled: VOICE_LINKS.filter((v) => v.status === 'scheduled').length,
      aired: VOICE_LINKS.filter((v) => v.status === 'aired').length,
      multilingualBulletinsToday: MULTILINGUAL_SCHEDULE.reduce((s, m) => s + m.bulletinsToday, 0),
      activeLanguages: MULTILINGUAL_SCHEDULE.filter((m) => m.bulletinsToday > 0).length,
    },
    tech: {
      voiceLink: 'Context-aware: reads outgoing+incoming track metadata, synthesizes link via cloned station voice',
      crossfade: 'Web Audio API crossfade between voice link and music (auto-ducking)',
      multilingual: 'ElevenLabs eleven_multilingual_v2 — supports 29 languages',
      pronunciationDict: 'JSON dictionary for local place names / artist names (IPA notation)',
      triggers: 'track.finished event → generate voice link → insert as sweeper cart into log',
    },
  })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))

  if (body.action === 'generate-voice-link') {
    const outgoing = body.outgoingTrack ?? { title: 'Previous Song', artist: 'Previous Artist' }
    const incoming = body.incomingTrack ?? { title: 'Next Song', artist: 'Next Artist' }
    const type = body.type ?? 'voice-link'

    // Context-aware script generation
    let script: string
    if (type === 'voice-link') {
      script = `That was ${outgoing.title} by ${outgoing.artist} — coming up, ${incoming.artist} with ${incoming.title} on Rock 88.7.`
    } else if (type === 'time-check') {
      const time = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      script = `It's ${time} — you're listening to Rock 88.7 FM. Up next, ${incoming.artist} with ${incoming.title}.`
    } else if (type === 'sweeper') {
      script = `Rock 88.7 — the best rock of all time. That was ${outgoing.artist}, and now ${incoming.artist} takes over.`
    } else {
      script = `You're listening to Rock 88.7 FM — Classic and Modern Rock.`
    }

    const vl: VoiceLink = {
      id: `vl-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type,
      outgoingTrack: outgoing,
      incomingTrack: incoming,
      script,
      audioUrl: `s3://rock887-voice-links/vl-${Date.now()}.wav`,
      durationMs: Math.max(4000, script.length * 90),
      voiceId: body.voiceId ?? 'voice-001',
      voiceName: body.voiceName ?? 'Rock Voice — Alex',
      language: body.language ?? 'en-US',
      mixedWithCrossfade: true,
      scheduledAt: body.scheduledAt ?? new Date(Date.now() + 60000).toISOString(),
      status: 'generated',
    }
    VOICE_LINKS.unshift(vl)
    return NextResponse.json({ ok: true, voiceLink: vl, message: `Generated ${type}: "${script}"` })
  }

  if (body.action === 'generate-multilingual-news') {
    const lang = body.language ?? 'en-US'
    const langInfo = SUPPORTED_LANGUAGES.find((l) => l.code === lang)
    if (!langInfo) return NextResponse.json({ ok: false, error: 'Unsupported language' }, { status: 400 })

    return NextResponse.json({
      ok: true,
      language: langInfo.name,
      languageCode: lang,
      script: body.script ?? `[${langInfo.name}] National news: The FCC announced new EAS requirements effective January 2027.`,
      voice: langInfo.elevenLabsVoice,
      pronunciationDictionary: MULTILINGUAL_SCHEDULE.find((m) => m.languageCode === lang)?.pronunciationDictionary ?? [],
      message: `Generated ${langInfo.name} news bulletin`,
    })
  }

  return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 })
}
