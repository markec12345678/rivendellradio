// @ts-nocheck — route uses dynamic imports
import { NextResponse } from 'next/server'
import { getWeatherForecast, generateWeatherScript } from '@/lib/external-apis/weather'

export const dynamic = 'force-dynamic'

/**
 * Weather API — real weather for the station location.
 *
 * GET /api/v1/external/weather
 *   Returns hourly forecast for the next 6 hours.
 *   Free, no API key (uses Open-Meteo).
 *
 * GET /api/v1/external/weather?script=true
 *   Returns a TTS-ready weather announcement script.
 *
 * GET /api/v1/external/weather?hours=12
 *   Returns forecast for the next 12 hours.
 *
 * Configure station location via env vars:
 *   STATION_LAT (default: 46.0569 = Ljubljana)
 *   STATION_LON (default: 14.5058 = Ljubljana)
 *   STATION_TIMEZONE (default: Europe/Ljubljana)
 */

export async function GET(req: Request) {
  const url = new URL(req.url)
  const hours = parseInt(url.searchParams.get('hours') || '6')
  const wantScript = url.searchParams.get('script') === 'true'
  const stationName = url.searchParams.get('stationName') || 'Rock 88.7 FM'
  const locationName = url.searchParams.get('location') || 'Ljubljana'

  try {
    const forecast = await getWeatherForecast(Math.min(hours, 48))

    if (wantScript) {
      const script = generateWeatherScript(forecast, stationName, locationName)
      return NextResponse.json({
        ok: true,
        script,
        forecast: forecast.hourly.slice(0, 3), // first 3 hours for context
        _note: 'TTS-ready weather script. POST to /api/v1/voice/synthesize with this text.',
      })
    }

    return NextResponse.json({
      ok: true,
      location: {
        latitude: forecast.latitude,
        longitude: forecast.longitude,
        timezone: forecast.timezone,
        name: locationName,
      },
      hourly: forecast.hourly,
      source: 'Open-Meteo (free, no API key)',
      _note:
        'Real weather data from Open-Meteo. Free for non-commercial use. ' +
        'No API key required. Configure station location via STATION_LAT/STATION_LON env vars.',
    })
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'Weather fetch failed',
        _fallback: 'Use simulated weather data from /api/v1/ai/show-prep as fallback',
      },
      { status: 500 },
    )
  }
}
