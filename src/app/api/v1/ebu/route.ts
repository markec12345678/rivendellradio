import { NextResponse } from 'next/server'
import { rockTracks } from '@/lib/rivendell/mock-data'

export const dynamic = 'force-dynamic'

// EBU Tech 3293 — EBUCore metadata
// Standard for exchanging music information between radio systems

function buildEbuCoreXml(): string {
  const items = rockTracks.filter((t) => t.type === 'music').slice(0, 10).map((track) => {
    return `    <ebucore:coreMetadata>
      <ebucore:title type="main">${escapeXml(track.title)}</ebucore:title>
      <ebucore:alternativeTitle type="artist">${escapeXml(track.artist)}</ebucore:alternativeTitle>
      <ebucore:alternativeTitle type="album">${escapeXml(track.album)}</ebucore:alternativeTitle>
      <ebucore:identifier typeLabel="ISRC">${track.isrc ?? ''}</ebucore:identifier>
      <ebucore:date typeLabel="releaseYear" startDate="${track.year ?? ''}"/>
      <ebucore:type>
        <ebucore:genre typeLabel="musicGenre">${escapeXml(track.genre)}</ebucore:genre>
      </ebucore:type>
      <ebucore:format>
        <ebucore:duration>
          <ebucore:normalPlayTime>${formatEbuDuration(track.length)}</ebucore:normalPlayTime>
        </ebucore:duration>
        <ebucore:audioEncoding>
          <ebucore:audioChannels>2</ebucore:audioChannels>
          <ebucore:sampleRate>48000</ebucore:sampleRate>
        </ebucore:audioEncoding>
      </ebucore:format>
      <ebucore:subject typeLabel="tempo">
        <ebucore:subject>${track.bpm ?? 0} BPM</ebucore:subject>
      </ebucore:subject>
      <ebucore:rights>
        <ebucore:rightsExpression typeLabel="copyright">${track.year ?? ''} ${escapeXml(track.artist)}</ebucore:rightsExpression>
      </ebucore:rights>
      <ebucore:part typeLabel="segment">
        <ebucore:partMetric>
          <ebucore:partTotalDuration>${formatEbuDuration(track.length)}</ebucore:partTotalDuration>
        </ebucore:partMetric>
      </ebucore:part>
    </ebucore:coreMetadata>`
  }).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<ebucore:ebuCoreMain xmlns:ebucore="urn:ebu:metadata-schema:ebuCore_2014"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="urn:ebu:metadata-schema:ebuCore_2014 https://www.ebu.ch/metadata/schemas/EBUCore_2014.xsd"
  version="1.8"
  dateLastModified="${new Date().toISOString()}"
  documentId="rock887-library-export"
  lang="en">
  <ebucore:coreMetadata>
    <ebucore:title type="main">Rock 88.7 FM Music Library Export</ebucore:title>
    <ebucore:description>EBU Tech 3293 EBUCore metadata for interoperability between radio systems</ebucore:description>
    <ebucore:format>
      <ebucore:audioEncoding>
        <ebucore:audioChannels>2</ebucore:audioChannels>
        <ebucore:sampleRate>48000</ebucore:sampleRate>
      </ebucore:audioEncoding>
    </ebucore:format>
  </ebucore:coreMetadata>
  <ebucore:metadataProvider>
    <ebucore:contactDetails>
      <ebucore:name>Rock 88.7 FM</ebucore:name>
      <ebucore:emailAddress>studio@rock887.fm</ebucore:emailAddress>
      <ebucore:webSite>https://rock887.fm</ebucore:webSite>
    </ebucore:contactDetails>
  </ebucore:metadataProvider>
${items}
</ebucore:ebuCoreMain>`
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

function formatEbuDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return `PT${h > 0 ? h + 'H' : ''}${m}M${s}S`
}

export async function GET(req: Request) {
  await new Promise((r) => setTimeout(r, 120))
  const { searchParams } = new URL(req.url)
  const format = searchParams.get('format')

  if (format === 'xml') {
    const xml = buildEbuCoreXml()
    return new NextResponse(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } })
  }

  // JSON summary (default)
  const musicTracks = rockTracks.filter((t) => t.type === 'music')
  return NextResponse.json({
    standard: 'EBU Tech 3293 (EBUCore 1.8)',
    description: 'Standard for exchanging music metadata between European radio systems',
    exportedTracks: musicTracks.length,
    fields: ['title', 'artist', 'album', 'ISRC', 'year', 'genre', 'duration', 'audioFormat', 'tempo (BPM)', 'rights'],
    xmlUrl: '/api/v1/ebu?format=xml',
    schemaUrl: 'https://www.ebu.ch/metadata/schemas/EBUCore_2014.xsd',
    compatible: ['BBC', 'ARD', 'SRG SSR', 'RTV Slovenija', 'Radio France', 'RAI'],
    lastExport: new Date().toISOString(),
  })
}
