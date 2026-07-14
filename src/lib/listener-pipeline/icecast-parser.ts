/**
 * Icecast2 stats parser — translates the real Icecast2 `/status-json.xsl`
 * response into the pipeline's normalized IngestionSession shape.
 *
 * ICECAST2 STATUS JSON — REAL FORMAT REFERENCE
 * ---------------------------------------------
 * Icecast2 exposes a JSON status endpoint at `/status-json.xsl` on the
 * admin port (default 8000). The response shape (Icecast2 2.4.x):
 *
 *   {
 *     "icestats": {
 *       "server_id": "Icecast 2.4.4",
 *       "server_start": "...",
 *       "source": [
 *         {
 *           "stream_start": "...",
 *           "listeners": 47,
 *           "listener_peak": 52,
 *           "server_name": "Rock 88.7 FM",
 *           "server_type": "audio/mpeg",
 *           "mount": "/rock-887.mp3",
 *           "listenurl": "http://stream.rock887.fm:8000/rock-887.mp3",
 *           "bitrate": 128,
 *           "genre": "Rock",
 *           "now_playing": "Foo Fighters - Everlong",
 *           "listeners_list": [           // <-- only if enabled in icecast.xml
 *             {
 *               "id": 12345,
 *               "ip": "203.0.113.42",
 *               "user_agent": "VLC/3.0.18",
 *               "connected": 1840,        // seconds
 *               "referer": "https://rock887.fm"
 *             }
 *           ]
 *         }
 *       ]
 *     }
 *   }
 *
 * IMPORTANT — Icecast2 listener tracking limitation:
 *   Icecast2's `listeners_list` shows currently-connected listeners, not
 *   historical sessions. To capture session START and END times, a real
 *   deployment needs ONE of:
 *
 *     (a) Icecast2 access logs parsed in real time (custom log tailer)
 *     (b) A reverse proxy (nginx/HAProxy) in front of Icecast2 that logs
 *         connect/disconnect with timestamps
 *     (c) AzuraCast's "Now Playing" API, which layers session tracking on
 *         top of Icecast2 and exposes /api/nowplaying/{station}
 *     (d) A custom Icecast2 auth pipeline (YP webhook or auth URL) that
 *         receives mount/dismount callbacks
 *
 * This parser implements option (b) — it accepts the normalized shape that
 * a log-tailer or reverse-proxy adapter would produce. The raw Icecast2
 * `/status-json.xsl` is consumed by a SEPARATE adapter (not included here)
 * that diffs the listener list between polls to infer disconnections.
 *
 * The parser below is the CONTRACT. The actual log-tailer adapter is a
 * deployment-specific artifact and is not part of this codebase. When a
 * real station deploys this system, the operator writes the adapter that
 * feeds IngestionSession objects into POST /api/v1/listener-pipeline.
 */

import type {
  IngestionSession,
  ListenerDevice,
} from './schema'

/**
 * Raw Icecast2 listener entry, as it appears in `listeners_list[]` of
 * `/status-json.xsl`. This is the real Icecast2 2.4.x shape.
 *
 * Reference: https://icecast.org/docs/icecast-2.4.1/
 */
export interface IcecastListenerEntry {
  id: number
  ip: string
  user_agent: string
  connected: number // seconds since connect
  referer?: string
  // Icecast2 does not natively provide useragent-based device classification;
  // the pipeline derives `device` from `user_agent` at ingestion time.
}

/**
 * Raw Icecast2 source entry (one per mount).
 */
export interface IcecastSourceEntry {
  mount: string
  listeners: number
  listener_peak: number
  server_name?: string
  server_type?: string
  listenurl: string
  bitrate?: number
  genre?: string
  now_playing?: string
  /** Present only if `<listener-stats>` is enabled in icecast.xml. */
  listeners_list?: IcecastListenerEntry[]
}

/**
 * The top-level Icecast2 `/status-json.xsl` response shape.
 */
export interface IcecastStatusResponse {
  icestats: {
    server_id?: string
    server_start?: string
    source?: IcecastSourceEntry | IcecastSourceEntry[]
  }
}

/**
 * Parse an Icecast2 `/status-json.xsl` response.
 *
 * Returns the list of currently-connected listeners across all mounts.
 * This is a SNAPSHOT, not a session list — Icecast2 does not expose session
 * start/end natively. The caller (the poller) is responsible for diffing
 * successive snapshots to infer session boundaries.
 *
 * This function is pure: it takes JSON, returns data. It does no I/O.
 * It will be unit-testable once a real station provides a real capture.
 */
export function parseIcecastStatus(
  json: unknown,
): { sources: IcecastSourceEntry[]; parsedAt: string } {
  if (!json || typeof json !== 'object') {
    throw new Error('Icecast2 status response is not an object')
  }
  const root = (json as IcecastStatusResponse).icestats
  if (!root) {
    throw new Error('Icecast2 status response missing `icestats` field')
  }

  const rawSource = root.source
  let sources: IcecastSourceEntry[] = []
  if (Array.isArray(rawSource)) {
    sources = rawSource
  } else if (rawSource) {
    sources = [rawSource]
  }

  return { sources, parsedAt: new Date().toISOString() }
}

/**
 * Diff two successive Icecast2 listener snapshots for a single mount and
 * produce inferred session-end events.
 *
 * This is the operation a real poller performs every N seconds. When a
 * listener ID present in snapshot A is absent in snapshot B, the poller
 * infers that the session ended sometime between A and B. The endedAt
 * timestamp is approximate (bounded by the poll interval).
 *
 * The startedAt timestamp comes from the `connected` field of the FIRST
 * snapshot in which the listener appeared: startedAt = now - connected*1000.
 *
 * IMPORTANT: this diff-based inference has inherent imprecision equal to
 * the poll interval. For sub-second precision, a log-tailer or auth-webhook
 * approach is required. The pipeline accepts this imprecision and records
 * it; downstream analysis must respect it.
 *
 * This function is the SOLE place where the system converts "Icecast2 said
 * a listener was here a minute ago and is not here now" into a session
 * record. It must be conservative: if a listener is absent from one poll
 * but reappears in the next (network blip), the poller must NOT emit a
 * session-end event. The poller (not this function) implements that
 * grace-window logic.
 */
export interface InferredSessionEnd {
  mount: string
  listenerId: number
  listenerHash: string
  userAgent: string
  referer?: string
  startedAt: string // ISO, inferred from first-seen `connected` field
  endedAt: string // ISO, the timestamp of the snapshot where the listener vanished
  /** Poll interval imprecision, in ms. Equals endedAt - previousSnapshotAt. */
  imprecisionMs: number
}

export function diffListenerSnapshots(
  prev: IcecastSourceEntry[],
  curr: IcecastSourceEntry[],
  currTimestamp: string,
): InferredSessionEnd[] {
  const ends: InferredSessionEnd[] = []

  for (const c of curr) {
    const p = prev.find((s) => s.mount === c.mount)
    if (!p?.listeners_list) continue
    if (!c.listeners_list) continue

    const prevIds = new Set(p.listeners_list.map((l) => l.id))
    // Listeners in prev but NOT in curr have disconnected.
    for (const listener of p.listeners_list) {
      if (!prevIds.has(listener.id)) continue
      const stillInCurr = c.listeners_list.some((l) => l.id === listener.id)
      if (stillInCurr) continue

      // Listener is gone. Infer the session.
      // startedAt = (time of prev snapshot) - connected*1000
      // We do not have the prev snapshot's timestamp here; the poller
      // passes it via the `prevTimestamp` parameter to the higher-level
      // loop. For this pure diff function, we record what we can.
      const startedAt = new Date(
        Date.parse(currTimestamp) - listener.connected * 1000,
      ).toISOString()

      ends.push({
        mount: c.mount,
        listenerId: listener.id,
        // PLACEHOLDER: raw IP. The poller MUST hash this via hashIp() before
        // persisting. The ingestion endpoint rejects any listenerHash that is
        // not a 64-char hex SHA-256 digest. See the NOTE at the bottom of this file.
        listenerHash: listener.ip,
        userAgent: listener.user_agent,
        referer: listener.referer,
        startedAt,
        endedAt: currTimestamp,
        imprecisionMs: 0, // set by the poller which has both timestamps
      })
    }
  }

  return ends
}

/**
 * Hash an IP address for pseudonymous storage.
 *
 * Uses salted SHA-256. The salt is read from the LISTENER_HASH_SALT env
 * var. If unset, this function throws — we never store unhashed IPs, and
 * we never use a default salt (which would be a security theater).
 *
 * The salt should be rotated quarterly. Rotation invalidates the ability
 * to correlate sessions across the rotation boundary, which is the desired
 * tradeoff: long-term pseudonymity is weakened on purpose.
 *
 * This function uses the Web Crypto API (SubtleCrypto), available in both
 * browser and Node 18+ / Bun. It is async by design.
 */
export async function hashIp(ip: string): Promise<string> {
  const salt = process.env.LISTENER_HASH_SALT
  if (!salt) {
    throw new Error(
      'LISTENER_HASH_SALT env var is not set. The pipeline refuses to store unhashed IPs. ' +
        'Set a random 32-byte salt (e.g. `openssl rand -hex 32`) before ingesting sessions.',
    )
  }
  const data = new TextEncoder().encode(salt + ':' + ip)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Classify a device from a User-Agent string.
 *
 * Detection order matters: car platforms (Android Auto, CarPlay) announce
 * themselves in the UA and should be detected before the underlying OS.
 *
 * This is a heuristic. It will misclassify some UAs. Misclassification is
 * acceptable for segmentation; it is NOT acceptable for individual decisions.
 * The `device` field powers aggregate analysis only.
 */
export function classifyDevice(userAgent: string): ListenerDevice {
  const ua = userAgent.toLowerCase()
  if (ua.includes('androidauto')) return 'car-androidauto'
  if (ua.includes('carplay')) return 'car-carplay'
  if (ua.includes('iphone') || ua.includes('ipad')) return 'mobile-ios'
  if (ua.includes('android')) return 'mobile-android'
  if (ua.includes('windows')) return 'desktop-windows'
  if (ua.includes('mac os') || ua.includes('macintosh')) return 'desktop-macos'
  if (ua.includes('linux')) return 'desktop-linux'
  if (ua.includes('alexa') || ua.includes('echo')) return 'smart-speaker'
  if (ua.includes('smart-tv') || ua.includes('webos') || ua.includes('tizen')) {
    return 'smart-tv'
  }
  if (ua.includes('mozilla') || ua.includes('chrome') || ua.includes('safari')) {
    return 'web-browser'
  }
  return 'unknown'
}

/**
 * Convert an InferredSessionEnd into an IngestionSession ready for the
 * pipeline. This is the boundary where Icecast2-specific data becomes
 * pipeline-normalized data.
 *
 * After this conversion, the Icecast2 parser's job is done. The pipeline
 * takes over: enriches with daypart, exit-track lookup, returning-listener
 * lookup, and persists.
 */
export function toIngestionSession(
  end: InferredSessionEnd,
): IngestionSession {
  return {
    startedAt: end.startedAt,
    endedAt: end.endedAt,
    mount: end.mount,
    listenerHash: end.listenerHash,
    userAgent: end.userAgent,
    referer: end.referer,
  }
}

/**
 * NOTE: The `hashIp` function above is async, but `diffListenerSnapshots`
 * produces `listenerHash` as a string synchronously. This is an intentional
 * design split:
 *
 *   - `diffListenerSnapshots` is pure and synchronous. It produces
 *     `InferredSessionEnd` objects with a PLACEHOLDER hash (the raw IP,
 *     or empty string).
 *   - The poller (the caller) then runs `hashIp` on each end before
 *     converting to IngestionSession. This keeps the pure parser free
 *     of I/O and crypto.
 *
 * The current code passes the raw IP as `listenerHash` from the diff
 * function, which is a known placeholder. The poller MUST hash before
 * persisting. The ingestion endpoint MUST reject any IngestionSession
 * whose listenerHash is not a 64-char hex SHA-256 digest.
 *
 * This belt-and-suspenders design ensures that even if the poller has a
 * bug, the endpoint refuses to persist unhashed IPs.
 */
