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
      voice: body.voice,
      speed: body.speed ?? 1.0,
      language: body.language || 'en',
      provider: body.provider || 'auto',
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
      provider: result.provider,
      providerLabel: result.providerLabel,

      // Player URL — can be opened directly in a browser
      playableUrl: `/api/v1/voice/play?file=${encodeURIComponent(result.audioUrl.split('/').pop() || '')}`,

      _note:
        `FREE TTS via ${result.providerLabel}. No API key cost. ` +
        'Provider chain: gTTS (most natural) → z-ai TTS (clear) → pyttsx3 (offline). ' +
        'The system automatically uses the best available provider.',
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
      'Voice Synthesis API. Multi-provider FREE TTS. No API key, no cost. ' +
      'Automatically uses the best available provider.',

    providers: {
      gtts: {
        name: 'Google Translate TTS (gTTS)',
        quality: 'HIGH — most natural, neural voice',
        cost: 'FREE — no API key',
        internet: 'required',
        languages: 'en, de, fr, es, it, pt, ru, ja, ko, zh, and 50+ more',
        voice: 'single voice per language (Google neural)',
        format: 'MP3 → converted to WAV (44.1kHz, 16-bit)',
      },
      zai: {
        name: 'z-ai TTS (tongtong)',
        quality: 'MEDIUM — clear but slightly robotic',
        cost: 'FREE — no API key',
        internet: 'required (SDK API)',
        voice: 'tongtong (single voice)',
        format: 'WAV (24kHz, 16-bit)',
      },
      pyttsx3: {
        name: 'pyttsx3 (offline system voice)',
        quality: 'LOW — robotic (espeak engine)',
        cost: 'FREE — no API key',
        internet: 'NOT required — fully offline',
        voice: 'system default (espeak)',
        format: 'WAV (22kHz, 16-bit)',
      },
    },

    providerChain: [
      '1. gTTS (most natural, tries first)',
      '2. z-ai TTS (fallback if gTTS fails)',
      '3. pyttsx3 (last resort, offline)',
    ],

    capabilities: {
      cost: 'FREE — no API key, no per-request charge, no subscription',
      speed: '0.5 to 2.0 (1.0 = normal) — gTTS only supports slow=false/true',
      format: 'WAV (44.1kHz for gTTS, 24kHz for z-ai, 22kHz for pyttsx3)',
      maxCharsPerRequest: 1024,
      languages: 'en (default), de, fr, es, it, pt, ru, ja, ko, zh, +50 more (gTTS)',
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

    advancedOptions: {
      provider: 'Force a specific provider: gtts | zai | pyttsx3 | auto (default)',
      language: 'ISO 639-1 language code: en (default), de, fr, es, ...',
    },

    limitations: [
      'gTTS: single voice per language (no voice cloning)',
      'gTTS: requires internet (calls Google Translate endpoint)',
      'pyttsx3: robotic quality (espeak engine)',
      '1024 chars per request (longer text is truncated)',
      'For voice cloning / multiple voices, consider ElevenLabs ($5/mo)',
    ],
  })
}
