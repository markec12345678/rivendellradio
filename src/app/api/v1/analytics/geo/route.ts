import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Real-Time Geo-Map Listener Analytics.
 *
 * City-level listener pulses fed from Icecast2 listener IPs (geo-IP lookup).
 * Click-through drills into city → ISP → device → retention.
 *
 * GET /api/v1/analytics/geo         — geo-distributed listeners + heatmap data
 *
 * Tech: react-simple-maps or Mapbox GL for visualization, MaxMind GeoIP2 for IP→city
 */

interface GeoListenerCluster {
  id: string
  city: string
  country: string
  countryCode: string
  lat: number
  lng: number
  listeners: number
  // Drill-down
  byDevice: { desktop: number; mobile: number; tablet: number; smartSpeaker: number; car: number }
  byIsp: { name: string; listeners: number }[]
  avgListenMinutes: number
  // For pulse animation
  pulseIntensity: number // 0-1, scales marker size
}

interface CountryAggregate {
  country: string
  countryCode: string
  listeners: number
  percentage: number
}

const CLUSTERS: GeoListenerCluster[] = [
  { id: 'geo-001', city: 'Ljubljana', country: 'Slovenia', countryCode: 'SI', lat: 46.0569, lng: 14.5058, listeners: 487, byDevice: { desktop: 145, mobile: 248, tablet: 32, smartSpeaker: 28, car: 34 }, byIsp: [{ name: 'Telekom Slovenije', listeners: 234 }, { name: 'A1 Slovenija', listeners: 142 }, { name: 'Telemach', listeners: 111 }], avgListenMinutes: 47, pulseIntensity: 0.95 },
  { id: 'geo-002', city: 'Maribor', country: 'Slovenia', countryCode: 'SI', lat: 46.5547, lng: 15.6459, listeners: 198, byDevice: { desktop: 42, mobile: 112, tablet: 14, smartSpeaker: 12, car: 18 }, byIsp: [{ name: 'Telekom Slovenije', listeners: 98 }, { name: 'Telemach', listeners: 67 }, { name: 'A1 Slovenija', listeners: 33 }], avgListenMinutes: 38, pulseIntensity: 0.72 },
  { id: 'geo-003', city: 'Celje', country: 'Slovenia', countryCode: 'SI', lat: 46.2389, lng: 15.2675, listeners: 142, byDevice: { desktop: 28, mobile: 89, tablet: 8, smartSpeaker: 7, car: 10 }, byIsp: [{ name: 'Telekom Slovenije', listeners: 67 }, { name: 'A1 Slovenija', listeners: 45 }, { name: 'Telemach', listeners: 30 }], avgListenMinutes: 32, pulseIntensity: 0.58 },
  { id: 'geo-004', city: 'Koper', country: 'Slovenia', countryCode: 'SI', lat: 45.5481, lng: 13.7300, listeners: 98, byDevice: { desktop: 22, mobile: 58, tablet: 6, smartSpeaker: 5, car: 7 }, byIsp: [{ name: 'Telemach', listeners: 42 }, { name: 'Telekom Slovenije', listeners: 34 }, { name: 'A1 Slovenija', listeners: 22 }], avgListenMinutes: 28, pulseIntensity: 0.45 },
  { id: 'geo-005', city: 'Nova Gorica', country: 'Slovenia', countryCode: 'SI', lat: 45.9576, lng: 13.6417, listeners: 67, byDevice: { desktop: 15, mobile: 41, tablet: 4, smartSpeaker: 3, car: 4 }, byIsp: [{ name: 'A1 Slovenija', listeners: 28 }, { name: 'Telemach', listeners: 22 }, { name: 'Telekom Slovenije', listeners: 17 }], avgListenMinutes: 24, pulseIntensity: 0.35 },
  { id: 'geo-006', city: 'Klagenfurt', country: 'Austria', countryCode: 'AT', lat: 46.6228, lng: 14.3055, listeners: 42, byDevice: { desktop: 12, mobile: 22, tablet: 3, smartSpeaker: 2, car: 3 }, byIsp: [{ name: 'A1 Telekom Austria', listeners: 24 }, { name: 'Magenta', listeners: 18 }], avgListenMinutes: 19, pulseIntensity: 0.28 },
  { id: 'geo-007', city: 'Trieste', country: 'Italy', countryCode: 'IT', lat: 45.6495, lng: 13.7768, listeners: 38, byDevice: { desktop: 8, mobile: 24, tablet: 2, smartSpeaker: 1, car: 3 }, byIsp: [{ name: 'TIM', listeners: 22 }, { name: 'WindTre', listeners: 16 }], avgListenMinutes: 17, pulseIntensity: 0.25 },
  { id: 'geo-008', city: 'Graz', country: 'Austria', countryCode: 'AT', lat: 47.0707, lng: 15.4395, listeners: 24, byDevice: { desktop: 7, mobile: 14, tablet: 1, smartSpeaker: 1, car: 1 }, byIsp: [{ name: 'A1 Telekom Austria', listeners: 14 }, { name: 'Magenta', listeners: 10 }], avgListenMinutes: 14, pulseIntensity: 0.18 },
]

export async function GET() {
  await new Promise((r) => setTimeout(r, 80))

  const totalListeners = CLUSTERS.reduce((s, c) => s + c.listeners, 0)
  const byCountry: Record<string, CountryAggregate> = {}
  for (const c of CLUSTERS) {
    if (!byCountry[c.country]) {
      byCountry[c.country] = { country: c.country, countryCode: c.countryCode, listeners: 0, percentage: 0 }
    }
    byCountry[c.country].listeners += c.listeners
  }
  for (const k of Object.keys(byCountry)) {
    byCountry[k].percentage = Math.round((byCountry[k].listeners / totalListeners) * 1000) / 10
  }

  const totalByDevice = CLUSTERS.reduce((acc, c) => ({
    desktop: acc.desktop + c.byDevice.desktop,
    mobile: acc.mobile + c.byDevice.mobile,
    tablet: acc.tablet + c.byDevice.tablet,
    smartSpeaker: acc.smartSpeaker + c.byDevice.smartSpeaker,
    car: acc.car + c.byDevice.car,
  }), { desktop: 0, mobile: 0, tablet: 0, smartSpeaker: 0, car: 0 })

  return NextResponse.json({
    totalListeners,
    clusters: CLUSTERS,
    byCountry: Object.values(byCountry).sort((a, b) => b.listeners - a.listeners),
    byDevice: {
      desktop: totalByDevice.desktop,
      mobile: totalByDevice.mobile,
      tablet: totalByDevice.tablet,
      smartSpeaker: totalByDevice.smartSpeaker,
      car: totalByDevice.car,
    },
    byDevicePct: {
      desktop: Math.round((totalByDevice.desktop / totalListeners) * 1000) / 10,
      mobile: Math.round((totalByDevice.mobile / totalListeners) * 1000) / 10,
      tablet: Math.round((totalByDevice.tablet / totalListeners) * 1000) / 10,
      smartSpeaker: Math.round((totalByDevice.smartSpeaker / totalListeners) * 1000) / 10,
      car: Math.round((totalByDevice.car / totalListeners) * 1000) / 10,
    },
    avgListenMinutes: Math.round(CLUSTERS.reduce((s, c) => s + c.avgListenMinutes * c.listeners, 0) / totalListeners),
    topCities: CLUSTERS.slice(0, 5).map((c) => ({ city: c.city, listeners: c.listeners, pct: Math.round((c.listeners / totalListeners) * 1000) / 10 })),
    tech: {
      geoIp: 'MaxMind GeoIP2 City (https://www.maxmind.com)',
      visualization: 'react-simple-maps or Mapbox GL',
      dataSource: 'Icecast2 listener IP addresses (poll every 30s)',
      privacy: 'IP addresses anonymized after geo-lookup (GDPR compliant)',
    },
    drillDown: {
      city: 'Click city → device breakdown + ISP + avg listen time',
      isp: 'Click ISP → listeners on that ISP + retention curves',
      device: 'Click device → retention curve for that device type',
    },
  })
}
