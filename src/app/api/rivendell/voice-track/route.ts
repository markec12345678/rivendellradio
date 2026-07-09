import { NextResponse } from 'next/server'
import { rockTracks } from '@/lib/rivendell/mock-data'

export const dynamic = 'force-dynamic'

interface VoiceTrackRequest {
  prevTrackId?: string
  nextTrackId?: string
  stationName?: string
  djName?: string
  timeOfDay?: string
}

const TIME_OF_DAY_GREETINGS: Record<string, string[]> = {
  morning: ['Good morning', 'Rise and shine', 'Morning rockers', 'Waking up with'],
  midday: ['Midday rock', 'Lunchtime listeners', 'Noon rockers', 'Midday madness'],
  afternoon: ['Afternoon drive', 'Cruising through the afternoon', 'Afternoon rockers'],
  evening: ['Evening rock', 'Night owls', 'Evening listeners', 'Rocking into the night'],
  overnight: ['Late night rock', 'Burning the midnight oil', 'Night shift rockers'],
}

function getTimeOfDay(): string {
  const h = new Date().getHours()
  if (h >= 5 && h < 10) return 'morning'
  if (h >= 10 && h < 14) return 'midday'
  if (h >= 14 && h < 18) return 'afternoon'
  if (h >= 18 && h < 22) return 'evening'
  return 'overnight'
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as VoiceTrackRequest
  await new Promise((r) => setTimeout(r, 300))

  const prevTrack = body.prevTrackId ? rockTracks.find((t) => t.id === body.prevTrackId) : null
  const nextTrack = body.nextTrackId ? rockTracks.find((t) => t.id === body.nextTrackId) : null
  const station = body.stationName ?? 'Rock 88.7'
  const dj = body.djName ?? 'DJ Mike'
  const tod = body.timeOfDay ?? getTimeOfDay()

  const greetings = TIME_OF_DAY_GREETINGS[tod] ?? TIME_OF_DAY_GREETINGS.afternoon
  const greeting = greetings[Math.floor(Math.random() * greetings.length)]

  // Generate 3 voice track script variations
  const scripts: string[] = []

  // Script 1: Simple intro
  if (nextTrack) {
    scripts.push(
      `${greeting}, you're listening to ${station} with ${dj}. ` +
      `That was ${prevTrack?.title ?? 'a great track'} from ${prevTrack?.artist ?? 'our library'}. ` +
      `Coming up next, ${nextTrack.title} by ${nextTrack.artist}. ` +
      `Stay tuned, more rock coming your way.`,
    )
  }

  // Script 2: Engaging with question
  if (nextTrack) {
    const questions = [
      `Ready for more?`,
      `How's your day going so far?`,
      `Got your volume up?`,
      `Feeling the rock yet?`,
    ]
    const q = questions[Math.floor(Math.random() * questions.length)]
    scripts.push(
      `${greeting}! ${q} It's ${dj} on ${station}. ` +
      `${prevTrack?.artist ?? 'That'} just wrapped up ${prevTrack?.title ?? 'a classic'}. ` +
      `Next up we've got ${nextTrack.title} — one of my favorites from ${nextTrack.artist}. ` +
      `Turn it up and let's keep rocking.`,
    )
  }

  // Script 3: Storytelling
  if (nextTrack) {
    const facts = [
      `Did you know ${nextTrack.artist} released this track in ${nextTrack.year ?? 'the golden era'}?`,
      `This next one comes from the album "${nextTrack.album}".`,
      `${nextTrack.artist} — ${nextTrack.genre} at its finest.`,
      `Coming in at ${Math.round((nextTrack.length ?? 0) / 1000)} seconds, here's ${nextTrack.title}.`,
    ]
    const fact = facts[Math.floor(Math.random() * facts.length)]
    scripts.push(
      `${dj} here on ${station}. ${fact} ` +
      `${prevTrack?.title ?? 'That last track'} was a solid choice to set the mood. ` +
      `Let's keep the energy going with ${nextTrack.title}.`,
    )
  }

  return NextResponse.json({
    scripts,
    timeOfDay: tod,
    greeting,
    station,
    dj,
    prevTrack: prevTrack ? { title: prevTrack.title, artist: prevTrack.artist } : null,
    nextTrack: nextTrack ? { title: nextTrack.title, artist: nextTrack.artist } : null,
  })
}
