/**
 * Listener Pipeline — the contract for real listener sessions.
 *
 * This module defines the SHAPE of real listener data. It contains zero data.
 * It will contain zero data until a real Icecast2 server is connected and
 * real sessions flow through the ingestion endpoint.
 *
 * See: docs/STATION-CHRONICLE.md — "The First Real Station Day"
 * See: docs/EPISTEMOLOGICAL-INVARIANTS.md — Invariant 1 (Reality)
 *
 * The discipline:
 *   - No simulated sessions in this file. Ever.
 *   - No demo sessions in this file. Ever.
 *   - The first row in the ListenerSession table will be a real row,
 *     from a real listener, on a real day. Until then, the table is empty
 *     and that emptiness is the honest state.
 *
 * The transition from `simulated` to `observed` for the entire system begins
 * the moment the first real session is persisted here. That moment is the
 * subject of the first real entry in docs/STATION-CHRONICLE.md.
 */

/**
 * A single listener session, as captured from a real streaming server.
 *
 * This is the atomic unit of the system's `sourceType: 'observed'` evidence.
 * Every field here must be populated from real streaming-server telemetry —
 * never from a generator, never from a demo, never from "what a session
 * might look like."
 *
 * Field semantics follow the Icecast2 / AzuraCast listener model:
 *   - session start = first byte sent to client (TTFB)
 *   - session end   = socket close OR idle timeout (configurable, default 30s)
 *   - duration      = end - start, in milliseconds
 *   - the track playing at session end is the "exit track" — the most
 *     important field for tune-out analysis
 */
export interface ListenerSession {
  /** Globally unique session ID (UUID v4). Generated at ingestion. */
  id: string

  /** ISO 8601 timestamp when the listener connected. */
  startedAt: string
  /** ISO 8601 timestamp when the listener disconnected or timed out. */
  endedAt: string
  /** Duration in milliseconds. Equals endedAt - startedAt. Stored explicitly for query speed. */
  durationMs: number

  /**
   * The streaming mount the listener connected to.
   * Example: "/rock-887.mp3", "/rock-887-ogg", "/live"
   * Allows one pipeline to serve multiple streams (main, low-bitrate, HLS).
   */
  mount: string

  /**
   * Listener IP address, hashed for pseudonymity.
   * The raw IP is NEVER stored. A salted SHA-256 hash is stored, allowing
   * session correlation for the same listener across days without enabling
   * PII recovery. The salt is rotated quarterly.
   *
   * Privacy: this field is pseudonymous, not anonymous. True anonymization
   * would prevent return-rate analysis. The tradeoff is documented here
   * explicitly: we need session correlation for the metrics, so we hash
   * rather than discard.
   */
  listenerHash: string

  /** User-Agent string from the HTTP request. Identifies player/device. */
  userAgent: string

  /** Derived from userAgent at ingestion time. */
  device: ListenerDevice

  /** Geographic region, derived from IP at ingestion time, coarse-grained. */
  geoRegion?: string

  /** Referrer — where the listener came from (website, app, directory, direct). */
  referer?: string

  /**
   * The track that was playing when the session ended.
   * This is the single most important field for tune-out analysis.
   * Null if the session ended during a non-track segment (ad, news, voice link).
   */
  exitTrackId?: string
  exitTrackTitle?: string
  exitTrackArtist?: string

  /** Position within the exit track when the session ended, in milliseconds. */
  exitTrackPositionMs?: number

  /** The daypart bucket at session start. Pre-computed at ingestion for fast grouping. */
  daypart: Daypart

  /** Number of tracks played during this session. */
  tracksPlayed: number

  /**
   * Whether the listener had at least one previous session in the last 7 days.
   * Pre-computed at ingestion from the listenerHash history.
   * This is the field that powers return-rate analysis.
   */
  returning: boolean

  /**
   * PROVENANCE — Invariant 1 (Reality).
   * Every session is `measured` by definition. This field exists so that
   * downstream consumers can never accidentally treat a session as a
   * prediction. If a session ever appears in the system with
   * source !== 'measured', something has gone very wrong.
   */
  source: 'measured'

  /** When this row was persisted. Distinct from startedAt (ingestion may lag). */
  ingestedAt: string
}

/**
 * Derived device classification. Computed from userAgent at ingestion time.
 * Kept as a small closed set for clean segmentation.
 */
export type ListenerDevice =
  | 'car-androidauto'
  | 'car-carplay'
  | 'mobile-ios'
  | 'mobile-android'
  | 'desktop-windows'
  | 'desktop-macos'
  | 'desktop-linux'
  | 'smart-speaker'
  | 'smart-tv'
  | 'web-browser'
  | 'unknown'

/**
 * Standard daypart buckets. Pre-computed at ingestion so that aggregate
 * queries do not need to re-bucket on every read.
 *
 * Boundaries follow typical US/EU radio programming:
 *   overnight    00:00–06:00
 *   morning      06:00–10:00  (morning drive)
 *   midday       10:00–15:00
 *   afternoon    15:00–19:00  (afternoon drive)
 *   evening      19:00–23:00
 *   late         23:00–24:00
 */
export type Daypart =
  | 'overnight'
  | 'morning'
  | 'midday'
  | 'afternoon'
  | 'evening'
  | 'late'

/**
 * Compute the daypart for a given timestamp.
 * Used at ingestion time so every session row has daypart pre-bucketed.
 */
export function computeDaypart(iso: string): Daypart {
  const h = new Date(iso).getHours()
  if (h < 6) return 'overnight'
  if (h < 10) return 'morning'
  if (h < 15) return 'midday'
  if (h < 19) return 'afternoon'
  if (h < 23) return 'evening'
  return 'late'
}

/**
 * Ingestion payload — what the Icecast2 poller sends to the pipeline.
 *
 * This is NOT the Icecast2 native format (see icecast-parser.ts for that).
 * This is the normalized shape the pipeline expects after parsing.
 *
 * The poller (which does not yet exist — see Endpoint TODO) is responsible
 * for translating Icecast2 `/status-json.xsl` output into this shape.
 */
export interface IngestionBatch {
  /** The streaming server that produced this batch. */
  source: string
  /** ISO timestamp when the poller fetched this batch. */
  fetchedAt: string
  /** The normalized sessions. May be empty (no new disconnects since last poll). */
  sessions: IngestionSession[]
}

/**
 * A session as it arrives from the poller, before enrichment.
 * The pipeline enriches this with: daypart, device classification,
 * returning-listener lookup, exit-track lookup.
 */
export interface IngestionSession {
  startedAt: string
  endedAt: string
  mount: string
  listenerHash: string
  userAgent: string
  referer?: string
  geoRegion?: string
}

/**
 * Pipeline status — what the GET endpoint returns.
 *
 * Honesty contract:
 *   - `connected` is false until a real Icecast2 server is configured and
 *     has produced at least one successful poll.
 *   - `totalSessions` is 0 until real sessions exist. It is NEVER inflated
 *     with simulated rows.
 *   - `lastIngestionAt` is null until the first real batch arrives.
 *
 * This object is the single source of truth for "does the system have real
 * listener data yet?" When `totalSessions > 0` for the first time, that is
 * the moment to write the first real entry in STATION-CHRONICLE.md.
 */
export interface PipelineStatus {
  /** Whether a real Icecast2 source is configured and responding. */
  connected: boolean
  /** Configured source URL, or null if none. */
  sourceUrl: string | null
  /** Total real sessions persisted. 0 until real data arrives. */
  totalSessions: number
  /** ISO timestamp of the last successful ingestion, or null. */
  lastIngestionAt: string | null
  /** ISO timestamp of the last poll attempt, or null. */
  lastPollAt: string | null
  /** Last error from the poller, or null. */
  lastError: string | null

  /**
   * The honest summary. This string is the system's public answer to
   * "do you have real listener data?" It must never lie.
   */
  summary: string
}
