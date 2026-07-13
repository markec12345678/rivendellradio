import { describe, expect, test } from 'bun:test'
import { parseCapXml, extractSameCode, SAME_EVENT_CODES, FCC_ORIGINATOR_CODES } from '../src/lib/cap-parser'

describe('CAP Parser', () => {
  const SAMPLE_CAP = `<?xml version="1.0" encoding="UTF-8"?>
<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">
  <identifier>NOAA-TOR-202607101430</identifier>
  <sender>noaa@weather.gov</sender>
  <sent>2026-07-10T14:30:00Z</sent>
  <status>Actual</status>
  <msgType>Alert</msgType>
  <scope>Public</scope>
  <source>NOAA/NWS</source>
  <info>
    <language>en-US</language>
    <category>Met</category>
    <event>Tornado Warning</event>
    <urgency>Immediate</urgency>
    <severity>Extreme</severity>
    <certainty>Observed</certainty>
    <effective>2026-07-10T14:30:00Z</effective>
    <expires>2026-07-10T15:30:00Z</expires>
    <areaDesc>Ljubljana, Slovenia</areaDesc>
    <geocode>
      <valueName>SAME</valueName>
      <value>TOR</value>
    </geocode>
    <parameter>
      <valueName>BHZ5</valueName>
      <value>12</value>
    </parameter>
  </info>
</alert>`

  test('parses valid CAP 1.2 XML', () => {
    const result = parseCapXml(SAMPLE_CAP)
    expect(result).not.toBeNull()
    expect(result?.identifier).toBe('NOAA-TOR-202607101430')
    expect(result?.sender).toBe('noaa@weather.gov')
    expect(result?.status).toBe('Actual')
    expect(result?.msgType).toBe('Alert')
    expect(result?.scope).toBe('Public')
    expect(result?.source).toBe('NOAA/NWS')
  })

  test('parses info block', () => {
    const result = parseCapXml(SAMPLE_CAP)
    expect(result?.info.length).toBe(1)
    expect(result?.info[0].language).toBe('en-US')
    expect(result?.info[0].category).toBe('Met')
    expect(result?.info[0].event).toBe('Tornado Warning')
    expect(result?.info[0].urgency).toBe('Immediate')
    expect(result?.info[0].severity).toBe('Extreme')
    expect(result?.info[0].certainty).toBe('Observed')
    expect(result?.info[0].areaDesc).toBe('Ljubljana, Slovenia')
  })

  test('parses geocode and parameters', () => {
    const result = parseCapXml(SAMPLE_CAP)
    expect(result?.info[0].geocode?.length).toBe(1)
    expect(result?.info[0].geocode?.[0].valueName).toBe('SAME')
    expect(result?.info[0].geocode?.[0].value).toBe('TOR')
    expect(result?.info[0].parameters?.length).toBe(1)
    expect(result?.info[0].parameters?.[0].valueName).toBe('BHZ5')
  })

  test('returns null for invalid XML', () => {
    expect(parseCapXml('<not-cap>')).toBeNull()
    expect(parseCapXml('')).toBeNull()
    expect(parseCapXml('<alert>')).toBeNull() // missing required fields
  })

  test('extractSameCode returns TOR for Tornado Warning', () => {
    const result = parseCapXml(SAMPLE_CAP)
    if (result) {
      const code = extractSameCode(result)
      expect(code).toBe('TOR')
    }
  })

  test('extractSameCode infers from event name', () => {
    const cap = `<?xml version="1.0"?>
<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">
  <identifier>TEST</identifier><sender>test</sender><sent>2026-01-01T00:00:00Z</sent>
  <status>Test</status><msgType>Alert</msgType><scope>Public</scope>
  <info><event>Required Weekly Test</event></info>
</alert>`
    const result = parseCapXml(cap)
    if (result) {
      const code = extractSameCode(result)
      expect(code).toBe('RWT')
    }
  })

  test('SAME_EVENT_CODES has 30+ codes', () => {
    expect(Object.keys(SAME_EVENT_CODES).length).toBeGreaterThan(30)
    expect(SAME_EVENT_CODES['TOR']).toBe('Tornado Warning')
    expect(SAME_EVENT_CODES['SVR']).toBe('Severe Thunderstorm Warning')
    expect(SAME_EVENT_CODES['RWT']).toBe('Required Weekly Test')
    expect(SAME_EVENT_CODES['RMT']).toBe('Required Monthly Test')
  })

  test('FCC_ORIGINATOR_CODES has 6 codes', () => {
    expect(Object.keys(FCC_ORIGINATOR_CODES).length).toBe(6)
    expect(FCC_ORIGINATOR_CODES['PEP']).toBe('Primary Entry Point System')
    expect(FCC_ORIGINATOR_CODES['WXR']).toBe('NOAA Weather Radio')
  })
})
