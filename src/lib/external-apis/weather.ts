/**
 * Weather API — free, no API key required.
 *
 * Uses Open-Meteo (https://open-meteo.com):
 *   - Free for non-commercial use
 *   - No API key needed
 *   - Hourly forecast for 7 days
 *   - Global coverage
 *
 * The station location is configured via env vars:
 *   STATION_LAT — latitude (default: 46.0569 = Ljubljana)
 *   STATION_LON — longitude (default: 14.5058 = Ljubljana)
 *   STATION_TIMEZONE — timezone (default: Europe/Ljubljana)
 */

const STATION_LAT = parseFloat(process.env.STATION_LAT || '46.0569')
const STATION_LON = parseFloat(process.env.STATION_LON || '14.5058')
const STATION_TIMEZONE = process.env.STATION_TIMEZONE || 'Europe/Ljubljana'

export interface WeatherForecast {
  latitude: number
  longitude: number
  timezone: string
  hourly: WeatherHour[]
}

export interface WeatherHour {
  time: string // ISO timestamp
  hour: number // 0-23
  tempC: number
  condition: string // human-readable
  weatherCode: number // WMO code
  precipitation: number // mm
  windKmh: number
  isDay: boolean
}

/**
 * WMO weather code → human-readable condition.
 * https://open-meteo.com/en/docs (WMO Weather interpretation codes)
 */
const WMO_CODES: Record<number, string> = {
  0: 'clear sky',
  1: 'mainly clear',
  2: 'partly cloudy',
  3: 'overcast',
  45: 'fog',
  48: 'depositing rime fog',
  51: 'light drizzle',
  53: 'moderate drizzle',
  55: 'dense drizzle',
  56: 'light freezing drizzle',
  57: 'dense freezing drizzle',
  61: 'slight rain',
  63: 'moderate rain',
  65: 'heavy rain',
  66: 'light freezing rain',
  67: 'heavy freezing rain',
  71: 'slight snow',
  73: 'moderate snow',
  75: 'heavy snow',
  77: 'snow grains',
  80: 'slight rain showers',
  81: 'moderate rain showers',
  82: 'violent rain showers',
  85: 'slight snow showers',
  86: 'heavy snow showers',
  95: 'thunderstorm',
  96: 'thunderstorm with slight hail',
  99: 'thunderstorm with heavy hail',
}

/**
 * Fetch weather forecast for the station location.
 *
 * Returns hourly forecast for the next `hours` hours (default: 6).
 * Free, no API key.
 */
export async function getWeatherForecast(hours = 6): Promise<WeatherForecast> {
  const url =
    `https://api.open-meteo.com/v1/forecast?` +
    `latitude=${STATION_LAT}&longitude=${STATION_LON}` +
    `&hourly=temperature_2m,precipitation,weathercode,windspeed_10m,is_day` +
    `&timezone=${encodeURIComponent(STATION_TIMEZONE)}` +
    `&forecast_days=2`

  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) {
    throw new Error(`Open-Meteo API error: ${res.status}`)
  }

  const data = await res.json()
  const hourly = data.hourly
  const times: string[] = hourly.time
  const temps: number[] = hourly.temperature_2m
  const codes: number[] = hourly.weathercode
  const precip: number[] = hourly.precipitation
  const winds: number[] = hourly.windspeed_10m
  const isDay: number[] = hourly.is_day

  // Find current hour index
  const now = new Date()
  const currentHourStr = now.toISOString().slice(0, 13) // "2026-07-14T13"
  let startIdx = times.findIndex((t) => t.startsWith(currentHourStr))
  if (startIdx < 0) startIdx = 0

  const forecastHours: WeatherHour[] = []
  for (let i = startIdx; i < Math.min(startIdx + hours, times.length); i++) {
    const time = times[i]
    const date = new Date(time)
    forecastHours.push({
      time,
      hour: date.getHours(),
      tempC: Math.round(temps[i]),
      condition: WMO_CODES[codes[i]] || `code-${codes[i]}`,
      weatherCode: codes[i],
      precipitation: precip[i],
      windKmh: Math.round(winds[i]),
      isDay: isDay[i] === 1,
    })
  }

  return {
    latitude: STATION_LAT,
    longitude: STATION_LON,
    timezone: STATION_TIMEZONE,
    hourly: forecastHours,
  }
}

/**
 * Generate a weather announcement script for TTS.
 *
 * Example: "It's 22 degrees and sunny in Ljubljana. Light wind at 5 kilometers
 * per hour. No precipitation expected in the next few hours."
 */
export function generateWeatherScript(
  forecast: WeatherForecast,
  stationName = 'Rock 88.7 FM',
  locationName = 'Ljubljana',
): string {
  const current = forecast.hourly[0]
  if (!current) return `Weather report for ${stationName}.`

  const parts: string[] = []
  parts.push(`It's ${current.tempC} degrees and ${current.condition} in ${locationName}.`)

  if (current.windKmh > 15) {
    parts.push(`Wind at ${current.windKmh} kilometers per hour.`)
  } else {
    parts.push(`Light wind at ${current.windKmh} kilometers per hour.`)
  }

  // Check next few hours for rain
  const rainComing = forecast.hourly.slice(1, 4).some((h) => h.precipitation > 0.5)
  if (rainComing) {
    parts.push('Precipitation expected in the next few hours.')
  } else {
    parts.push('No precipitation expected in the next few hours.')
  }

  parts.push(`You're listening to ${stationName}.`)

  return parts.join(' ')
}
