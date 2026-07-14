import { NextResponse } from 'next/server'
import {
  synthesizeSpeech,
  generateVoiceLinkScript,
  generateStationIdScript,
  generateTimeCheckScript,
} from '@/lib/voice/tts-provider'

export const dynamic = 'force-dynamic'

/**
 * Voice Synthesis API — FREE TTS using z-ai-web-dev-sdk.
 *
 * Generates audio files from text. No API key cost, no ElevenLabs.
 *
 * POST /api/v1/voice/synthesize
 *
 * Modes:
 *   1. Direct text → speech
 *      { "text": "Welcome to Rock 88.7" }
 *
 *   2. Voice link (auto-generated script)
 *      { "mode": "voice-link", "outgoing": {title, artist}, "incoming": {title, artist} }
 *
 *   3. Station ID
 *      { "mode": "station-id" }
 *
 *   4. Time check
 *      { "mode": "time-check", "time": "10:30" }
 *
 * Returns:
 *   { ok: true, audioUrl: "/voice-links/vl-123.wav", durationMs: 8500, ... }
 *
 * The audio file is saved to public/voice-links/ and served statically.
 */

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)

  if (!body) {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON body' },
      { status: 400 },
    )
  }

  let text = ''
  let mode = 'text'

  if (body.text) {
    // Direct text mode
    text = body.text
    mode = 'text'
  } else if (body.mode === 'voice-link') {
    // Voice link mode — generate script from track metadata
    text = generateVoiceLinkScript({
      outgoingTitle: body.outgoing?.title,
      outgoingArtist: body.outgoing?.artist,
      incomingTitle: body.incoming?.title,
      incomingArtist: body.incoming?.artist,
      stationName: body.stationName,
      includeTimeCheck: body.includeTimeCheck,
      currentTime: body.currentTime,
    })
    mode = 'voice-link'
  } else if (body.mode === 'station-id') {
    text = generateStationIdScript(body.stationName)
    mode = 'station-id'
  } else if (body.mode === 'time-check') {
    text = generateTimeCheckScript(body.time || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }), body.stationName)
    mode = 'time-check'
  } else {
    return NextResponse.json(
      {
        ok: false,
        error: 'Provide "text" or "mode" (voice-link, station-id, time-check)',
        examples: {
          text: { text: 'Welcome to Rock 88.7' },
          'voice-link': {
            mode: 'voice-link',
            outgoing: { title: 'Everlong', artist: 'Foo Fighters' },
            incoming: { title: 'Thunderstruck', artist: 'AC/DC' },
          },
          'station-id': { mode: 'station-id' },
          'time-check': { mode: 'time-check', time: '10:30' },
        },
      },
      { status: 400 },
    )
  }

  try {
    const result = await synthesizeSpeech(text, {
      voice: body.voice || 'tongtong',
      speed: body.speed ?? 1.0,
    })

    return NextResponse.json({
      ok: true,
      mode,
      text,
      audioUrl: result.audioUrl,
      audioPath: result.audioPath,
      durationMs: result.durationMs,
      format: result.format,
      voice: result.voice,
      charCount: result.charCount,

      // Player URL — can be opened directly in a browser
      playableUrl: `/api/v1/voice/play?file=${encodeURIComponent(result.audioUrl.split('/').pop() || '')}`,

      _note:
        'FREE TTS via z-ai-web-dev-sdk. No API key cost. ' +
        'Voice: "tongtong" (clear radio voice). ' +
        'For production-grade natural voice, consider ElevenLabs ($5/mo). ' +
        'For pilot, this is sufficient.',
    })
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'TTS synthesis failed',
        text,
      },
      { status: 500 },
    )
  }
}

/**
 * GET — list recently generated voice links
 */
export async function GET() {
  return NextResponse.json({
    _disclaimer:
      'Voice Synthesis API. FREE TTS via z-ai-web-dev-sdk. No API key cost. ' +
      'Generates WAV audio files (24kHz, 16-bit PCM).',

    capabilities: {
      cost: 'FREE — no API key, no per-request charge',
      voice: 'tongtong (default, clear radio voice)',
      speed: '0.5 to 2.0 (1.0 = normal)',
      format: 'WAV (24kHz, 16-bit, mono)',
      maxCharsPerRequest: 1024,
      sampleRate: 24000,
    },

    modes: {
      text: { description: 'Direct text → speech', example: { text: 'Welcome to Rock 88.7' } },
      'voice-link': {
        description: 'Auto-generated voice link between tracks',
        example: {
          mode: 'voice-link',
          outgoing: { title: 'Everlong', artist: 'Foo Fighters' },
          incoming: { title: 'Thunderstruck', artist: 'AC/DC' },
        },
      },
      'station-id': {
        description: 'Station identification',
        example: { mode: 'station-id' },
      },
      'time-check': {
        description: 'Time announcement',
        example: { mode: 'time-check', time: '10:30' },
      },
    },

    limitations: [
      'Single voice (tongtong) — no voice cloning',
      'WAV format only (not MP3)',
      '24kHz sample rate (not studio-grade 48kHz)',
      '1024 chars per request (longer text is truncated)',
      'Good enough for pilot; for production consider ElevenLabs',
    ],

    upgrade_path:
      'For natural human-like voice, set ELEVENLABS_API_KEY env var ' +
      'and the system will use ElevenLabs instead of z-ai TTS. ' +
      'Cost: ~$5/month for 30,000 characters.',
  })
}
