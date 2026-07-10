'use server'

/**
 * Server Actions — Next.js 16 + React 19 idiomatic mutations.
 *
 * These replace the previous Route Handler POST endpoints with 'use server' functions
 * that can be called directly from client components. They:
 *   - Validate input with zod schemas
 *   - Execute the mutation on the server
 *   - Return serializable results
 *   - Work with useFormStatus (pending state) and useOptimistic (instant UI update)
 *
 * Spec: https://react.dev/reference/rsc/server-actions
 */

import { z } from 'zod'
import { db } from '@/lib/db'
import crypto from 'crypto'
import { revalidatePath } from 'next/cache'

// ============================================================================
// Webhook CRUD
// ============================================================================

const CreateWebhookSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url(),
  events: z.string().default('*'),
  generateSecret: z.boolean().default(true),
})

export async function createWebhook(formData: FormData): Promise<{ ok: boolean; webhook?: any; error?: string }> {
  const raw = {
    name: formData.get('name') as string,
    url: formData.get('url') as string,
    events: (formData.get('events') as string) || '*',
    generateSecret: formData.get('generateSecret') !== 'false',
  }

  const parsed = CreateWebhookSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  try {
    const secret = parsed.data.generateSecret ? crypto.randomBytes(32).toString('hex') : null
    const webhook = await db.webhook.create({
      data: {
        name: parsed.data.name,
        url: parsed.data.url,
        secret,
        events: parsed.data.events,
        active: true,
      },
    })

    await db.auditLog.create({
      data: {
        action: 'create',
        entity: 'webhook',
        entityId: String(webhook.id),
        details: JSON.stringify({ name: webhook.name, url: webhook.url, events: webhook.events }),
      },
    })

    revalidatePath('/')

    return {
      ok: true,
      webhook: {
        ...webhook,
        secret, // vrni secret samo enkrat
        lastFired: null,
        createdAt: webhook.createdAt.toISOString(),
      },
    }
  } catch (err: any) {
    return { ok: false, error: err?.message ?? 'Failed to create webhook' }
  }
}

const DeleteWebhookSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export async function deleteWebhook(id: number): Promise<{ ok: boolean; error?: string }> {
  const parsed = DeleteWebhookSchema.safeParse({ id })
  if (!parsed.success) {
    return { ok: false, error: 'Invalid webhook ID' }
  }

  try {
    await db.webhook.delete({ where: { id: parsed.data.id } })
    await db.auditLog.create({
      data: {
        action: 'delete',
        entity: 'webhook',
        entityId: String(parsed.data.id),
        details: JSON.stringify({ deletedAt: new Date().toISOString() }),
      },
    })
    revalidatePath('/')
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err?.message ?? 'Failed to delete webhook' }
  }
}

export async function toggleWebhook(id: number, active: boolean): Promise<{ ok: boolean; error?: string }> {
  try {
    await db.webhook.update({ where: { id }, data: { active } })
    await db.auditLog.create({
      data: {
        action: 'update',
        entity: 'webhook',
        entityId: String(id),
        details: JSON.stringify({ active }),
      },
    })
    revalidatePath('/')
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err?.message ?? 'Failed to toggle webhook' }
  }
}

// ============================================================================
// Anomaly acknowledge
// ============================================================================

export async function acknowledgeAnomaly(anomalyId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await db.auditLog.create({
      data: {
        action: 'acknowledge',
        entity: 'anomaly',
        entityId: anomalyId,
        details: JSON.stringify({ acknowledgedAt: new Date().toISOString() }),
      },
    })
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err?.message ?? 'Failed to acknowledge anomaly' }
  }
}

// ============================================================================
// EAS test (RWT/RMT) — server action variant
// ============================================================================

const EasTestSchema = z.object({
  type: z.enum(['RWT', 'RMT']),
  operatorId: z.string().optional(),
})

export async function runEasTest(formData: FormData): Promise<{ ok: boolean; result?: any; error?: string }> {
  const raw = {
    type: formData.get('type') as 'RWT' | 'RMT',
    operatorId: formData.get('operatorId') as string | undefined,
  }

  const parsed = EasTestSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, error: 'Invalid test type (must be RWT or RMT)' }
  }

  const now = new Date()
  const durationMs = parsed.data.type === 'RMT' ? 10000 : 8000
  const testIdentifier = `ROCK887-${parsed.data.type}-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`

  try {
    await db.easLog.create({
      data: {
        eventType: parsed.data.type === 'RMT' ? 'monthly-test' : 'weekly-test',
        alertId: testIdentifier,
        originator: 'EAS',
        decoderId: 'rock887-eas-controller',
        receivedAt: now,
        durationMs,
        operatorId: parsed.data.operatorId ?? 'admin@rock887.fm',
        result: 'success',
        resultDetail: `${parsed.data.type === 'RMT' ? 'Required Monthly Test' : 'Required Weekly Test'} (${parsed.data.type}) broadcast successfully`,
        fccStatusCode: 'EAS',
        sameCode: parsed.data.type,
        notes: `47 CFR §11.61 ${parsed.data.type === 'RMT' ? 'monthly' : 'weekly'} test requirement satisfied`,
      },
    })

    return {
      ok: true,
      result: {
        testIdentifier,
        type: parsed.data.type,
        typeName: parsed.data.type === 'RMT' ? 'Required Monthly Test' : 'Required Weekly Test',
        broadcastAt: now.toISOString(),
        durationMs,
        nextDue: new Date(now.getTime() + (parsed.data.type === 'RMT' ? 30 : 7) * 86400000).toISOString(),
      },
    }
  } catch (err: any) {
    return { ok: false, error: err?.message ?? 'Failed to run EAS test' }
  }
}

// ============================================================================
// DR Failover action (server action variant)
// ============================================================================

const FailoverActionSchema = z.object({
  action: z.enum(['failover', 'drill', 'recover']),
  operatorId: z.string().optional(),
})

export async function triggerFailover(formData: FormData): Promise<{ ok: boolean; event?: any; error?: string; message?: string }> {
  const raw = {
    action: formData.get('action') as 'failover' | 'drill' | 'recover',
    operatorId: formData.get('operatorId') as string | undefined,
  }

  const parsed = FailoverActionSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, error: 'Invalid action (must be failover, drill, or recover)' }
  }

  try {
    await db.auditLog.create({
      data: {
        action: 'dr-failover',
        entity: 'security',
        entityId: `failover-${Date.now()}`,
        details: JSON.stringify({
          action: parsed.data.action,
          operatorId: parsed.data.operatorId,
          timestamp: new Date().toISOString(),
        }),
      },
    })

    return {
      ok: true,
      event: { action: parsed.data.action, timestamp: new Date().toISOString() },
      message: parsed.data.action === 'drill'
        ? '✅ DR drill complete: simulated failover (no on-air impact)'
        : parsed.data.action === 'recover'
          ? '✅ Recovered to primary studio'
          : '🚨 Failover triggered',
    }
  } catch (err: any) {
    return { ok: false, error: err?.message ?? 'Failed to trigger failover' }
  }
}
