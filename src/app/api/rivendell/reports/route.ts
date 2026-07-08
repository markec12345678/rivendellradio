import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Generate 24h listener history (hourly buckets) for each station
function generateHistory(stationId: string, baseListeners: number) {
  const data = []
  for (let h = 0; h < 24; h++) {
    // Simulate daypart pattern: peak in morning (7-9) and afternoon (15-18)
    let multiplier = 0.6
    if (h >= 6 && h <= 9) multiplier = 1.2 + Math.sin((h - 6) * 0.8) * 0.2
    else if (h >= 15 && h <= 18) multiplier = 1.1 + Math.sin((h - 15) * 0.8) * 0.15
    else if (h >= 10 && h <= 14) multiplier = 0.9
    else if (h >= 19 && h <= 22) multiplier = 0.85
    else if (h >= 0 && h <= 5) multiplier = 0.35
    const variance = (Math.random() - 0.5) * 0.1
    data.push({
      hour: `${String(h).padStart(2, '0')}:00`,
      listeners: Math.max(0, Math.round(baseListeners * (multiplier + variance))),
    })
  }
  return data
}

export async function GET() {
  await new Promise((r) => setTimeout(r, 150))
  const stations = [
    { id: 'main-fm', name: 'Rock 88.7 FM', baseListeners: 1287 },
    { id: 'web-hd', name: 'Rock HD Stream', baseListeners: 412 },
    { id: 'mobile', name: 'Rock Mobile', baseListeners: 89 },
  ]
  const stations_data = stations.map((s) => ({
    ...s,
    history: generateHistory(s.id, s.baseListeners),
  }))
  const totalHistory = stations_data[0].history.map((d, i) => ({
    hour: d.hour,
    listeners: stations_data.reduce((acc, s) => acc + s.history[i].listeners, 0),
  }))
  return NextResponse.json({
    stations: stations_data,
    total: totalHistory,
    peak: Math.max(...totalHistory.map((d) => d.listeners)),
    avg: Math.round(totalHistory.reduce((a, d) => a + d.listeners, 0) / 24),
    current: totalHistory[new Date().getHours()]?.listeners ?? 0,
  })
}
