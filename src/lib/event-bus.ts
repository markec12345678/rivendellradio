// Event Bus — centralni event sistem za modularno arhitekturo
//
// Namesto da vsak modul kliče drugega, vsi moduli publishajo event-e
// na Event Bus, subscribri pa jih poslušajo.
//
// track.started → Event Bus → RDS, DAB+, WebSocket, Logger, AI, Now Playing, Analytics
//

import { EventEmitter } from 'events'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import { db } from '@/lib/db'

// ============================================================================
// Event tipi (v1 — z version + correlationId)
// ============================================================================

export interface BaseEvent {
  eventId: string // UUID za deduplikacijo
  version: number // event schema version (trenutno 1)
  type: string
  timestamp: number
  source: string // kateri modul je sprožil event
  correlationId: string // za sledenje kaskadnim dogodkom
  data: Record<string, unknown>
}

export interface TrackStartedEvent extends BaseEvent {
  type: 'track.started'
  data: {
    trackId: string
    title: string
    artist: string
    album: string
    albumArt?: string
    length: number
    station: string
    listeners: number
  }
}

export interface TrackFinishedEvent extends BaseEvent {
  type: 'track.finished'
  data: {
    trackId: string
    title: string
    artist: string
    playedDuration: number
    station: string
  }
}

export interface PlaylistUpdatedEvent extends BaseEvent {
  type: 'playlist.updated'
  data: {
    showId: string
    showName: string
    lineCount: number
    action: 'reorder' | 'add' | 'delete' | 'transition'
  }
}

export interface RequestCreatedEvent extends BaseEvent {
  type: 'request.created'
  data: {
    requestId: string
    trackId: string
    title: string
    artist: string
    listenerName: string
  }
}

export interface RequestApprovedEvent extends BaseEvent {
  type: 'request.approved'
  data: {
    requestId: string
    trackId: string
    title: string
  }
}

export interface RdsUpdatedEvent extends BaseEvent {
  type: 'rds.updated'
  data: {
    pi: string
    ps: string
    pty: number
    rt: string
    dls: string
  }
}

export interface VuUpdatedEvent extends BaseEvent {
  type: 'vu.updated'
  data: {
    left: number
    right: number
    peak: number
  }
}

export interface MicEvent extends BaseEvent {
  type: 'mic.open' | 'mic.closed'
  data: {
    micId: number
    studio: string
  }
}

export interface StudioEvent extends BaseEvent {
  type: 'studio.online' | 'studio.offline'
  data: {
    studioId: string
    studioName: string
  }
}

export interface StreamListenersChangedEvent extends BaseEvent {
  type: 'stream.listeners.changed'
  data: {
    stationId: string
    listeners: number
    delta: number
  }
}

export interface AlertCreatedEvent extends BaseEvent {
  type: 'alert.created'
  data: {
    alertId: string
    severity: 'info' | 'warning' | 'error' | 'critical'
    message: string
    source: string
  }
}

export type BroadcastEvent =
  | TrackStartedEvent
  | TrackFinishedEvent
  | PlaylistUpdatedEvent
  | RequestCreatedEvent
  | RequestApprovedEvent
  | RdsUpdatedEvent
  | VuUpdatedEvent
  | MicEvent
  | StudioEvent
  | StreamListenersChangedEvent
  | AlertCreatedEvent

export type EventHandler = (event: BroadcastEvent) => void

// ============================================================================
// Event Bus implementacija
// ============================================================================

class EventBus {
  private emitter = new EventEmitter()
  private history: BroadcastEvent[] = []
  private maxHistory = 100

  constructor() {
    this.emitter.setMaxListeners(50) // veliko subscriberjev
  }

  /** Publish event na bus — vsi subscriberji prejmejo + persist v DB */
  publish(event: BroadcastEvent): void {
    // Idempotency check — preveri ali eventId že obstaja v memory history
    if (this.history.some((e) => e.eventId === event.eventId)) {
      return // Duplicate event — ignore (idempotency)
    }

    // Schema validation
    const validated = safeValidateEvent(event)
    if (!validated) {
      metrics.eventsFailed++
      return
    }

    // Record metrics
    recordMetric(event)

    // Shrani v memory history
    this.history.push(event)
    if (this.history.length > this.maxHistory) {
      this.history.shift()
    }

    // Persist v database (async, ne blokiraj)
    this.persistEvent(event).catch(() => {})

    // Fire webhook subscriptions (async, ne blokiraj)
    this.fireWebhooks(event).catch(() => {})

    // Emit vsem subscriberjem
    this.emitter.emit(event.type, event)
    this.emitter.emit('*', event) // wildcard — vsi dogodki
  }

  /** Persist event v EventStore (database) */
  private async persistEvent(event: BroadcastEvent): Promise<void> {
    try {
      await db.eventStore.create({
        data: {
          eventId: event.eventId,
          type: event.type,
          version: event.version,
          source: event.source,
          correlationId: event.correlationId,
          data: JSON.stringify(event.data),
          timestamp: new Date(event.timestamp),
        },
      })
    } catch {
      // Silent fail — ne blokiraj event bus-a
    }
  }

  /** Fire webhook subscriptions za ta event */
  private async fireWebhooks(event: BroadcastEvent): Promise<void> {
    try {
      const webhooks = await db.webhook.findMany({ where: { active: true } })
      for (const wh of webhooks) {
        // Preveri ali je webhook subscribed na ta event type
        const subscribedTypes = wh.events.split(',').map((s) => s.trim())
        if (!subscribedTypes.includes('*') && !subscribedTypes.includes(event.type)) continue

        // Pošlji webhook (ne čakaj na rezultat)
        this.deliverWebhook(wh, event).catch(() => {})
      }
    } catch {
      // Silent fail
    }
  }

  /** Deliver webhook z DLQ, retry policy, in idempotency tracking */
  private async deliverWebhook(wh: { id: number; url: string; secret: string | null }, event: BroadcastEvent): Promise<void> {
    // Create delivery record for tracking (idempotency + DLQ)
    let deliveryId: number | null = null
    try {
      const delivery = await db.webhookDelivery.create({
        data: {
          webhookId: wh.id,
          eventId: event.eventId,
          eventType: event.type,
          payload: JSON.stringify(event),
          status: 'pending',
          attemptCount: 0,
        },
      })
      deliveryId = delivery.id
    } catch {
      // If delivery record already exists for this eventId, skip (idempotency)
      return
    }

    try {
      metrics.webhookDeliveries++
      const body = JSON.stringify(event)
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Event-Id': event.eventId,
        'X-Event-Type': event.type,
        'X-Correlation-Id': event.correlationId,
      }

      // HMAC signing če ima secret
      if (wh.secret) {
        const crypto = await import('crypto')
        const signature = crypto.createHmac('sha256', wh.secret).update(body).digest('hex')
        headers['X-Webhook-Signature'] = `sha256=${signature}`
      }

      const res = await fetch(wh.url, { method: 'POST', headers, body, signal: AbortSignal.timeout(5000) })

      if (res.ok) {
        // Success — update delivery + webhook
        await db.webhookDelivery.update({
          where: { id: deliveryId! },
          data: { status: 'delivered', lastStatus: res.status, deliveredAt: new Date(), attemptCount: { increment: 1 } },
        })
        await db.webhook.update({
          where: { id: wh.id },
          data: { lastFired: new Date(), lastStatus: res.status, failCount: 0 },
        })
      } else {
        // HTTP error — check retry policy
        await this.handleWebhookFailure(deliveryId!, wh, event, res.status, `HTTP ${res.status}`)
      }
    } catch (err) {
      // Network error — check retry policy
      const errMsg = err instanceof Error ? err.message : 'Network error'
      await this.handleWebhookFailure(deliveryId!, wh, event, 0, errMsg)
    }
  }

  /** Handle webhook failure z exponential backoff + DLQ */
  private async handleWebhookFailure(
    deliveryId: number,
    wh: { id: number },
    event: BroadcastEvent,
    statusCode: number,
    error: string,
  ): Promise<void> {
    metrics.webhookFailures++

    // Get current attempt count
    const delivery = await db.webhookDelivery.findUnique({ where: { id: deliveryId } })
    if (!delivery) return

    const attemptCount = delivery.attemptCount + 1
    const MAX_RETRIES = 3

    if (attemptCount >= MAX_RETRIES) {
      // Send to DLQ
      metrics.webhookDLQ++
      await db.webhookDelivery.update({
        where: { id: deliveryId },
        data: { status: 'dlq', lastStatus: statusCode, lastError: error, attemptCount },
      })
      await db.webhook.update({
        where: { id: wh.id },
        data: { failCount: { increment: 1 }, lastStatus: statusCode },
      })
    } else {
      // Schedule retry z exponential backoff: 1s, 5s, 30s
      const backoffMs = [1000, 5000, 30000][attemptCount - 1] ?? 30000
      const nextRetry = new Date(Date.now() + backoffMs)
      await db.webhookDelivery.update({
        where: { id: deliveryId },
        data: { status: 'failed', lastStatus: statusCode, lastError: error, attemptCount, nextRetry },
      })
      await db.webhook.update({
        where: { id: wh.id },
        data: { failCount: { increment: 1 }, lastStatus: statusCode },
      })
    }
  }

  /** Subscribe na specifičen event tip */
  subscribe(eventType: string, handler: EventHandler): () => void {
    this.emitter.on(eventType, handler)
    return () => this.emitter.off(eventType, handler)
  }

  /** Subscribe na vse evente (wildcard) */
  subscribeAll(handler: EventHandler): () => void {
    this.emitter.on('*', handler)
    return () => this.emitter.off('*', handler)
  }

  /** Pridobi zadnje evente (memory history) */
  getHistory(limit = 50): BroadcastEvent[] {
    return this.history.slice(-limit)
  }

  /** Pridobi zadnje evente določenega tipa (memory history) */
  getHistoryByType(type: string, limit = 20): BroadcastEvent[] {
    return this.history.filter((e) => e.type === type).slice(-limit)
  }

  /** Počisti memory history (DB history ostane) */
  clearHistory(): void {
    this.history = []
  }
}

// Singleton — ena instanca za celoten sistem
export const eventBus = new EventBus()

// ============================================================================
// Event Schema Validation (Zod)
// ============================================================================

const eventSchema = z.object({
  eventId: z.string().uuid(),
  version: z.number().int().positive().default(1),
  type: z.string().min(1),
  timestamp: z.number().int().positive(),
  source: z.string().min(1),
  correlationId: z.string().uuid(),
  data: z.record(z.unknown()),
})

/** Validate event against schema — throws if invalid */
export function validateEvent(event: unknown): BroadcastEvent {
  return eventSchema.parse(event) as BroadcastEvent
}

/** Safe validate — returns null on invalid */
export function safeValidateEvent(event: unknown): BroadcastEvent | null {
  const result = eventSchema.safeParse(event)
  return result.success ? (result.data as BroadcastEvent) : null
}

// ============================================================================
// Metrics (Prometheus-compatible)
// ============================================================================

interface Metrics {
  eventsTotal: number
  eventsFailed: number
  eventsByType: Record<string, number>
  webhookDeliveries: number
  webhookFailures: number
  webhookDLQ: number
  eventLatencyMs: number[]
  startTime: number
}

const metrics: Metrics = {
  eventsTotal: 0,
  eventsFailed: 0,
  eventsByType: {},
  webhookDeliveries: 0,
  webhookFailures: 0,
  webhookDLQ: 0,
  eventLatencyMs: [],
  startTime: Date.now(),
}

function recordMetric(event: BroadcastEvent): void {
  metrics.eventsTotal++
  metrics.eventsByType[event.type] = (metrics.eventsByType[event.type] ?? 0) + 1
  const latency = Date.now() - event.timestamp
  metrics.eventLatencyMs.push(latency)
  if (metrics.eventLatencyMs.length > 100) metrics.eventLatencyMs.shift()
}

export function getMetrics() {
  const avgLatency = metrics.eventLatencyMs.length > 0
    ? Math.round(metrics.eventLatencyMs.reduce((a, b) => a + b, 0) / metrics.eventLatencyMs.length)
    : 0
  return {
    ...metrics,
    avgEventLatencyMs: avgLatency,
    uptime: Math.round((Date.now() - metrics.startTime) / 1000),
  }
}

/** Export metrics v Prometheus formatu */
export function getPrometheusMetrics(): string {
  const m = getMetrics()
  const lines: string[] = []
  lines.push('# HELP events_total Total events published')
  lines.push('# TYPE events_total counter')
  lines.push(`events_total ${m.eventsTotal}`)
  lines.push('# HELP events_failed Total events that failed processing')
  lines.push('# TYPE events_failed counter')
  lines.push(`events_failed ${m.eventsFailed}`)
  lines.push('# HELP webhook_deliveries Total webhook deliveries attempted')
  lines.push('# TYPE webhook_deliveries counter')
  lines.push(`webhook_deliveries ${m.webhookDeliveries}`)
  lines.push('# HELP webhook_failures Total webhook delivery failures')
  lines.push('# TYPE webhook_failures counter')
  lines.push(`webhook_failures ${m.webhookFailures}`)
  lines.push('# HELP webhook_dlq Total webhooks sent to dead letter queue')
  lines.push('# TYPE webhook_dlq counter')
  lines.push(`webhook_dlq ${m.webhookDLQ}`)
  lines.push('# HELP event_latency_ms Average event processing latency in ms')
  lines.push('# TYPE event_latency_ms gauge')
  lines.push(`event_latency_ms ${m.avgEventLatencyMs}`)
  lines.push('# HELP uptime_seconds Server uptime in seconds')
  lines.push('# TYPE uptime_seconds gauge')
  lines.push(`uptime_seconds ${m.uptime}`)
  // Per-type counters
  for (const [type, count] of Object.entries(m.eventsByType)) {
    lines.push(`events_by_type{type="${type}"} ${count}`)
  }
  return lines.join('\n')
}

// ============================================================================
// Helper funkcije za publishanje tipičnih eventov (z auto correlationId)
// ============================================================================

function createEvent(type: string, source: string, data: Record<string, unknown>, correlationId?: string): BroadcastEvent {
  return {
    eventId: randomUUID(),
    version: 1,
    type,
    timestamp: Date.now(),
    source,
    correlationId: correlationId ?? randomUUID(),
    data,
  }
}

export function publishTrackStarted(data: TrackStartedEvent['data'], correlationId?: string): void {
  const event = createEvent('track.started', 'playout', data, correlationId)
  eventBus.publish(event)

  // Cascading: track.started → rds.updated (isti correlationId)
  publishRdsUpdated({
    pi: '887F',
    ps: 'ROCK887',
    pty: 11,
    ptyLabel: 'Rock music',
    rt: `${data.artist} - ${data.title}`,
    dls: `Now playing: ${data.title} by ${data.artist}`,
  }, event.correlationId)
}

export function publishTrackFinished(data: TrackFinishedEvent['data'], correlationId?: string): void {
  eventBus.publish(createEvent('track.finished', 'playout', data, correlationId))
}

export function publishRdsUpdated(data: RdsUpdatedEvent['data'], correlationId?: string): void {
  eventBus.publish(createEvent('rds.updated', 'rds-engine', data, correlationId))
}

export function publishVuUpdated(data: VuUpdatedEvent['data'], correlationId?: string): void {
  eventBus.publish(createEvent('vu.updated', 'audio-engine', data, correlationId))
}

export function publishRequestCreated(data: RequestCreatedEvent['data'], correlationId?: string): void {
  eventBus.publish(createEvent('request.created', 'listener-api', data, correlationId))
}

export function publishAlert(data: AlertCreatedEvent['data'], correlationId?: string): void {
  eventBus.publish(createEvent('alert.created', data.source, data, correlationId))
}
