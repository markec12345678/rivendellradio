import { NextResponse } from 'next/server'
import { rockTracks, scheduleShows, stations } from '@/lib/rivendell/mock-data'

export const dynamic = 'force-dynamic'

// RadioDNS — Service and Programme Information (SPI)
// RadioEPG — Electronic Programme Guide
// RadioVIS — Visual content (album art, station logos)

function buildSpiXml(): string {
  const now = new Date()
  const todayShows = scheduleShows.slice(0, 5)
  const programmes = todayShows.map((show, idx) => {
    const start = new Date(now)
    start.setHours(parseInt(show.startTime.split(':')[0]), parseInt(show.startTime.split(':')[1]), 0, 0)
    const end = new Date(start.getTime() + show.logLines.reduce((a, l) => a + l.length, 0))
    return `    <programme id="${show.id}" shortId="${idx + 1}">
      <mediumName>${show.name}</mediumName>
      <longName>${show.name} with ${show.host}</longName>
      <shortDescription>${show.name} — ${show.host}</shortDescription>
      <longDescription>Join ${show.host} for ${show.name} on Rock 88.7 FM. The best classic and modern rock.</longDescription>
      <location>
        <bearer id="fm"/>
        <time actualStart="${start.toISOString()}" actualDuration="${end.getTime() - start.getTime()}" />
      </location>
      <mediaDescription>
        <multimedia url="https://rock887.fm/logos/station-logo-512.png" type="logo_colour_square" width="512" height="512"/>
      </mediaDescription>
      <genre href="urn:tva:metadata:cs:ContentCS:2010:3.1" type="main">Rock Music</genre>
    </programme>`
  }).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<epg system="DAB" xml:lang="en" version="1">
  <services>
    <service id="rock887">
      <mediumName>Rock 88.7</mediumName>
      <longName>Rock 88.7 FM — Classic &amp; Modern Rock</longName>
      <shortDescription>The best classic and modern rock</shortDescription>
      <mediaDescription>
        <multimedia url="https://rock887.fm/logos/station-logo-512.png" type="logo_colour_square" width="512" height="512"/>
      </mediaDescription>
      <genres>
        <genre href="urn:tva:metadata:cs:ContentCS:2010:3.1" type="main">Rock Music</genre>
      </genres>
    </service>
  </services>
  <programmes>
${programmes}
  </programmes>
</epg>`
}

function buildRadioVisXml(): string {
  const currentTrack = rockTracks.find((t) => t.type === 'music') ?? rockTracks[0]
  return `<?xml version="1.0" encoding="UTF-8"?>
<radiovis>
  <studio id="rock887-main">
    <name>Rock 88.7 Main Studio</name>
    <description>Now playing: ${currentTrack.title} by ${currentTrack.artist}</description>
    <images>
      <image type="station_logo" url="https://rock887.fm/logos/station-logo-512.png" width="512" height="512"/>
      <image type="show_logo" url="https://rock887.fm/logos/afternoon-drive.png" width="320" height="240"/>
      <image type="now_playing" url="https://rock887.fm${currentTrack.albumArt ?? '/album-art/rock-1.png'}" width="300" height="300"/>
    </images>
    <links>
      <link type="website" url="https://rock887.fm" description="Rock 88.7 Website"/>
      <link type="stream" url="http://stream.rock887.fm:8000/main.mp3" description="Listen Live"/>
      <link type="request" url="https://rock887.fm/request" description="Request a Song"/>
      <link type="social" url="https://twitter.com/rock887" description="Follow on Twitter"/>
    </links>
  </studio>
</radiovis>`
}

function buildDnsConfig(): object {
  return {
    domain: 'radiodns.rock887.fm',
    records: [
      { type: 'CNAME', name: '087.c.887f.radiodns.rock887.fm', target: 'epg.rock887.fm', ttl: 3600, description: 'FM RDS → RadioDNS discovery' },
      { type: 'CNAME', name: '096.dab.rock887.radiodns.rock887.fm', target: 'epg.rock887.fm', ttl: 3600, description: 'DAB+ → RadioDNS discovery' },
      { type: 'CNAME', name: '_radiovis._tcp.rock887.radiodns.rock887.fm', target: 'vis.rock887.fm', ttl: 3600, description: 'RadioVIS service' },
      { type: 'CNAME', name: '_radioepg._tcp.rock887.radiodns.rock887.fm', target: 'epg.rock887.fm', ttl: 3600, description: 'RadioEPG service' },
      { type: 'CNAME', name: '_radiotag._tcp.rock887.radiodns.rock887.fm', target: 'tag.rock887.fm', ttl: 3600, description: 'RadioTag service' },
    ],
    services: [
      { id: 'spi', name: 'SPI (Service & Programme Info)', url: '/api/v1/radiodns?format=spi', status: 'active', lastGenerated: new Date().toISOString() },
      { id: 'epg', name: 'RadioEPG (Electronic Programme Guide)', url: '/api/v1/radiodns?format=epg', status: 'active', lastGenerated: new Date().toISOString() },
      { id: 'vis', name: 'RadioVIS (Visual Content)', url: '/api/v1/radiodns?format=vis', status: 'active', lastGenerated: new Date().toISOString() },
      { id: 'tag', name: 'RadioTag (Interactive Links)', url: '/api/v1/radiodns?format=tag', status: 'pending', lastGenerated: null },
    ],
    coverage: {
      fm: { frequency: '88.7 MHz', pi: '887F', ps: 'ROCK887', coverage: 'Greater Metro Area' },
      dab: { ensemble: 'RockDAB', serviceId: 'rock887', bitrate: '96 kbps', codec: 'AAC+', coverage: 'National DAB+' },
      ip: { url: 'http://stream.rock887.fm:8000/main.mp3', codec: 'MP3 192k', coverage: 'Worldwide' },
    },
  }
}

export async function GET(req: Request) {
  await new Promise((r) => setTimeout(r, 120))
  const { searchParams } = new URL(req.url)
  const format = searchParams.get('format')

  // XML formats
  if (format === 'spi' || format === 'epg') {
    const xml = buildSpiXml()
    return new NextResponse(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } })
  }
  if (format === 'vis') {
    const xml = buildRadioVisXml()
    return new NextResponse(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } })
  }

  // JSON overview (default)
  return NextResponse.json({
    status: 'active',
    domain: 'radiodns.rock887.fm',
    description: 'RadioDNS enables hybrid radio — FM/DAB+ receivers discover internet content via DNS',
    ...buildDnsConfig(),
  })
}
