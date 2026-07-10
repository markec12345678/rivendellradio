/**
 * CAP 1.2 XML parser — minimal non-validating parser that extracts the
 * fields we need from OASIS CAP 1.2 alerts.
 *
 * Spec: https://docs.oasis-open.org/emergency/cap/v1.2/CAP-v1.2.html
 *
 * For production use, consider a full XSD validator (cap-validator npm package
 * or libxml2-based parsing). This implementation handles the common cases
 * emitted by FEMA IPAWS-OPEN.
 */

export interface ParsedCapAlert {
  identifier: string
  sender: string
  sent: string // ISO 8601
  status: 'Actual' | 'Exercise' | 'System' | 'Test' | 'Draft'
  msgType: 'Alert' | 'Update' | 'Cancel' | 'Ack' | 'Error'
  scope: 'Public' | 'Restricted' | 'Private'
  source?: string
  code?: string[]
  info: CapInfo[]
  rawXml: string
}

export interface CapInfo {
  language?: string
  category?: string
  event?: string
  urgency?: 'Immediate' | 'Expected' | 'Future' | 'Past' | 'Unknown'
  severity?: 'Extreme' | 'Severe' | 'Moderate' | 'Minor' | 'Unknown'
  certainty?: 'Observed' | 'Likely' | 'Possible' | 'Unlikely' | 'Unknown'
  effective?: string
  onset?: string
  expires?: string
  senderName?: string
  headline?: string
  description?: string
  instruction?: string
  areaDesc?: string
  geocode?: { valueName: string; value: string }[]
  parameters?: { valueName: string; value: string }[]
}

/**
 * Extract the first text content of an XML element.
 */
function extractTag(xml: string, tag: string, parent?: string): string | undefined {
  // If parent is provided, search within the parent block
  const searchXml = parent ? extractBlock(xml, parent) ?? '' : xml
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i')
  const m = searchXml.match(re)
  return m ? m[1].trim() : undefined
}

/**
 * Extract all text contents for a repeated XML element.
 */
function extractAllTags(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'gi')
  const results: string[] = []
  let m
  while ((m = re.exec(xml)) !== null) {
    results.push(m[1].trim())
  }
  return results
}

/**
 * Extract a block (everything between opening and closing tag, including nested).
 */
function extractBlock(xml: string, tag: string): string | undefined {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i')
  const m = xml.match(re)
  return m ? m[1] : undefined
}

/**
 * Extract all <info> blocks (CAP allows multiple for different languages).
 */
function extractInfoBlocks(xml: string): string[] {
  const blocks: string[] = []
  const re = /<info[^>]*>([\s\S]*?)<\/info>/gi
  let m
  while ((m = re.exec(xml)) !== null) {
    blocks.push(m[1])
  }
  return blocks
}

/**
 * Extract <valueName>/<value> pairs (used for geocode and parameter).
 */
function extractValueNamePairs(block: string, container: 'geocode' | 'parameter'): { valueName: string; value: string }[] {
  const containerBlock = extractBlock(block, container)
  if (!containerBlock) return []
  const pairs: { valueName: string; value: string }[] = []
  const re = /<valueName[^>]*>([\s\S]*?)<\/valueName>\s*<value[^>]*>([\s\S]*?)<\/value>/gi
  let m
  while ((m = re.exec(containerBlock)) !== null) {
    pairs.push({ valueName: m[1].trim(), value: m[2].trim() })
  }
  return pairs
}

export function parseCapXml(rawXml: string): ParsedCapAlert | null {
  try {
    // Basic sanity check
    if (!/<alert[\s>]/i.test(rawXml)) return null

    const identifier = extractTag(rawXml, 'identifier')
    const sender = extractTag(rawXml, 'sender')
    const sent = extractTag(rawXml, 'sent')
    const status = extractTag(rawXml, 'status') as ParsedCapAlert['status']
    const msgType = extractTag(rawXml, 'msgType') as ParsedCapAlert['msgType']
    const scope = extractTag(rawXml, 'scope') as ParsedCapAlert['scope']
    const source = extractTag(rawXml, 'source')
    const codes = extractAllTags(rawXml, 'code')

    if (!identifier || !sender || !sent || !status || !msgType || !scope) {
      return null
    }

    // Parse all <info> blocks
    const infoBlocks = extractInfoBlocks(rawXml)
    const info: CapInfo[] = infoBlocks.map((block) => ({
      language: extractTag(block, 'language'),
      category: extractTag(block, 'category'),
      event: extractTag(block, 'event'),
      urgency: extractTag(block, 'urgency') as CapInfo['urgency'],
      severity: extractTag(block, 'severity') as CapInfo['severity'],
      certainty: extractTag(block, 'certainty') as CapInfo['certainty'],
      effective: extractTag(block, 'effective'),
      onset: extractTag(block, 'onset'),
      expires: extractTag(block, 'expires'),
      senderName: extractTag(block, 'senderName'),
      headline: extractTag(block, 'headline'),
      description: extractTag(block, 'description'),
      instruction: extractTag(block, 'instruction'),
      areaDesc: extractTag(block, 'areaDesc'),
      geocode: extractValueNamePairs(block, 'geocode'),
      parameters: extractValueNamePairs(block, 'parameter'),
    }))

    return {
      identifier,
      sender,
      sent,
      status,
      msgType,
      scope,
      source,
      code: codes.length > 0 ? codes : undefined,
      info,
      rawXml,
    }
  } catch {
    return null
  }
}

/**
 * Convert a SAME (Specific Area Message Encoding) event code to a human-readable name.
 * Source: FCC 47 CFR §11.31 + NWS SAME codes.
 */
export const SAME_EVENT_CODES: Record<string, string> = {
  // National
  EAN: 'Emergency Action Notification',
  EAT: 'Emergency Action Termination',
  NIC: 'National Information Center',
  NPT: 'National Periodic Test',
  RMT: 'Required Monthly Test',
  RWT: 'Required Weekly Test',
  // Weather
  TOR: 'Tornado Warning',
  TOA: 'Tornado Watch',
  SVR: 'Severe Thunderstorm Warning',
  SVA: 'Severe Thunderstorm Watch',
  FFW: 'Flash Flood Warning',
  FFA: 'Flash Flood Watch',
  FLW: 'Flood Warning',
  FLA: 'Flood Watch',
  WSW: 'Winter Storm Warning',
  WSA: 'Winter Storm Watch',
  BZW: 'Blizzard Warning',
  HWW: 'High Wind Warning',
  HWA: 'High Wind Watch',
  TSW: 'Tsunami Warning',
  TSA: 'Tsunami Watch',
  EVI: 'Evacuation Immediate',
  CEM: 'Civil Emergency Message',
  ADR: 'Administrative Message',
  // Civil
  AVO: 'Avalanche Warning',
  AVA: 'Avalanche Watch',
  FRW: 'Fire Warning',
  SPW: 'Shelter in Place Warning',
  SQW: 'Snow Squall Warning',
  DSW: 'Dust Storm Warning',
  // Law Enforcement
  LEW: 'Law Enforcement Warning',
  LAE: 'Local Area Emergency',
  NMN: 'Network Message Notification',
  // Blue Alert
  BLU: 'Blue Alert',
}

/**
 * FCC originator codes (47 CFR §11.31).
 */
export const FCC_ORIGINATOR_CODES: Record<string, string> = {
  PEP: 'Primary Entry Point System',
  WXR: 'NOAA Weather Radio',
  EAS: 'EAS Participant',
  CIV: 'Civil Authority',
  WRM: 'Weather Radio Manufacturer',
  ORG: 'Organization',
}

/**
 * Determine the SAME code from a parsed CAP alert's parameters.
 */
export function extractSameCode(alert: ParsedCapAlert): string | null {
  for (const info of alert.info) {
    if (!info.parameters) continue
    const same = info.parameters.find(
      (p) => p.valueName.toUpperCase() === 'SAME' || p.valueName.toUpperCase() === 'EAS',
    )
    if (same) return same.value
  }
  // Infer from event name
  const event = alert.info[0]?.event?.toLowerCase() ?? ''
  if (event.includes('tornado warning')) return 'TOR'
  if (event.includes('thunderstorm warning')) return 'SVR'
  if (event.includes('flash flood warning')) return 'FFW'
  if (event.includes('flood warning')) return 'FLW'
  if (event.includes('winter storm warning')) return 'WSW'
  if (event.includes('required weekly test')) return 'RWT'
  if (event.includes('required monthly test')) return 'RMT'
  if (event.includes('test')) return 'RWT'
  return null
}
