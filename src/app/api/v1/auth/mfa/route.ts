import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

/**
 * Multi-Factor Authentication (MFA) — TOTP RFC 6238 + WebAuthn passkeys.
 *
 * Enforced for admin/technical-engineer/program-director/traffic roles.
 * Destructive actions (rml:send, eas:interrupt, track.delete, user.delete)
 * require "step-up" re-auth within last 5 minutes.
 *
 * GET  /api/v1/auth/mfa         — current MFA status + enrolled devices
 * POST /api/v1/auth/mfa         — enroll/verify/disable TOTP or WebAuthn
 *
 * Spec references:
 *   - RFC 6238 (TOTP: Time-Based One-Time Password)
 *   - RFC 6238 §4 (algorithm: HMAC-SHA1, 30s step, 6 digits)
 *   - WebAuthn (W3C Recommendation 2019) — passkeys
 *   - NIST SP 800-63B AAL2 (two-factor authentication)
 */

interface TotpEnrollment {
  id: string
  userId: string
  secret: string         // base32 TOTP secret
  qrCodeUrl: string      // otpauth:// URL
  label: string
  enrolledAt: string
  verified: boolean
  backupCodes: string[]  // 8 one-time backup codes (bcrypt hashed in production)
}

interface WebauthnDevice {
  id: string
  userId: string
  credentialId: string   // base64url
  publicKey: string      // base64url
  counter: number
  transports: ('usb' | 'nfc' | 'ble' | 'internal' | 'hybrid')[]
  deviceType: 'platform' | 'cross-platform'  // platform = Touch ID/Windows Hello
  name: string           // user-provided label
  enrolledAt: string
  lastUsedAt: string | null
}

interface StepUpSession {
  userId: string
  authenticatedAt: string
  expiresAt: string      // 5 min
  method: 'totp' | 'webauthn' | 'backup-code'
}

// In-memory store (production: Prisma + Redis)
const TOTP_ENROLLMENTS: TotpEnrollment[] = []
const WEBAUTHN_DEVICES: WebauthnDevice[] = [
  {
    id: 'wa-001',
    userId: 'admin@rock887.fm',
    credentialId: 'aB3cD4eF5gH6iJ7kL8mN9oP0qR1sT2u',
    publicKey: 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...',
    counter: 42,
    transports: ['internal'],
    deviceType: 'platform',
    name: 'MacBook Pro Touch ID',
    enrolledAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    lastUsedAt: new Date(Date.now() - 3600000).toISOString(),
  },
]
const STEP_UP_SESSIONS: StepUpSession[] = []

const ENFORCED_ROLES = ['admin', 'technical-engineer', 'program-director', 'traffic']
const STEP_UP_ACTIONS = ['rml:send', 'eas:interrupt', 'track:delete', 'user:delete', 'webhook:delete', 'failover:trigger']
const STEP_UP_TTL_MS = 5 * 60 * 1000

function generateTotpSecret(): string {
  // 20 random bytes → base32 (32 chars)
  const bytes = crypto.randomBytes(20)
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let secret = ''
  for (let i = 0; i < bytes.length; i += 5) {
    const chunk = (bytes[i] << 24) | ((bytes[i + 1] || 0) << 16) | ((bytes[i + 2] || 0) << 8) | (bytes[i + 3] || 0)
    for (let j = 0; j < 8; j++) {
      secret += alphabet[(chunk >> (27 - j * 5)) & 31]
      if (secret.length >= 32) break
    }
  }
  return secret.slice(0, 32)
}

function generateBackupCodes(): string[] {
  return Array.from({ length: 8 }, () =>
    Array.from({ length: 4 }, () => Math.random().toString(36).slice(2, 6).toUpperCase()).join('-'),
  )
}

export async function GET(req: Request) {
  await new Promise((r) => setTimeout(r, 80))
  const url = new URL(req.url)
  const userId = url.searchParams.get('userId') ?? 'admin@rock887.fm'

  const totp = TOTP_ENROLLMENTS.filter((t) => t.userId === userId)
  const webauthn = WEBAUTHN_DEVICES.filter((w) => w.userId === userId)
  const stepUp = STEP_UP_SESSIONS.find((s) => s.userId === userId && new Date(s.expiresAt) > new Date())

  return NextResponse.json({
    userId,
    mfaEnabled: totp.some((t) => t.verified) || webauthn.length > 0,
    enforcedRoles: ENFORCED_ROLES,
    stepUpActions: STEP_UP_ACTIONS,
    stepUpTtlMs: STEP_UP_TTL_MS,
    stepUpActive: !!stepUp,
    stepUpExpiresAt: stepUp?.expiresAt ?? null,
    enrollments: {
      totp: totp.map((t) => ({ ...t, secret: t.verified ? '***' : t.secret, backupCodes: t.verified ? [] : t.backupCodes })),
      webauthn: webauthn.map((w) => ({
        id: w.id,
        name: w.name,
        deviceType: w.deviceType,
        transports: w.transports,
        enrolledAt: w.enrolledAt,
        lastUsedAt: w.lastUsedAt,
        counter: w.counter,
      })),
    },
    compliance: {
      standard: 'NIST SP 800-63B AAL2',
      description: 'Two-factor authentication required for privileged roles',
      recoveryCodes: 8,
      stepUpWindow: '5 minutes for destructive actions',
    },
  })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const userId = body.userId ?? 'admin@rock887.fm'

  // Enroll TOTP
  if (body.action === 'enroll-totp') {
    const secret = generateTotpSecret()
    const issuer = 'Rock 88.7 FM'
    const label = `${issuer}:${userId}`
    const qrCodeUrl = `otpauth://totp/${encodeURIComponent(label)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`
    const backupCodes = generateBackupCodes()
    const enrollment: TotpEnrollment = {
      id: `totp-${Date.now()}`,
      userId,
      secret,
      qrCodeUrl,
      label,
      enrolledAt: new Date().toISOString(),
      verified: false,
      backupCodes,
    }
    TOTP_ENROLLMENTS.push(enrollment)
    return NextResponse.json({
      ok: true,
      enrollment: {
        id: enrollment.id,
        secret,
        qrCodeUrl,
        label,
        backupCodes, // vrni samo enkrat
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
      },
      message: 'Scan QR code with Google Authenticator / Authy / 1Password, then verify with action=verify-totp',
    })
  }

  // Verify TOTP
  if (body.action === 'verify-totp') {
    const enrollment = TOTP_ENROLLMENTS.find((t) => t.userId === userId && !t.verified)
    if (!enrollment) {
      return NextResponse.json({ ok: false, error: 'No pending TOTP enrollment' }, { status: 404 })
    }
    // Simulate verification (production: otplib.authenticator.check(body.code, enrollment.secret))
    const valid = /^\d{6}$/.test(body.code ?? '')
    if (valid) {
      enrollment.verified = true
      try {
        await db.auditLog.create({
          data: { action: 'mfa-enroll', entity: 'auth', entityId: enrollment.id, details: JSON.stringify({ method: 'totp', userId }) },
        })
      } catch {}
      return NextResponse.json({ ok: true, message: 'TOTP enrollment verified — MFA now active' })
    }
    return NextResponse.json({ ok: false, error: 'Invalid TOTP code' }, { status: 400 })
  }

  // Begin WebAuthn registration
  if (body.action === 'webauthn-register-begin') {
    const challenge = crypto.randomBytes(32).toString('base64url')
    const userIdB64 = Buffer.from(userId).toString('base64url')
    return NextResponse.json({
      ok: true,
      publicKey: {
        challenge,
        rp: { name: 'Rock 88.7 FM', id: 'localhost' },
        user: { id: userIdB64, name: userId, displayName: userId },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },   // ES256
          { type: 'public-key', alg: -257 }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: body.platform ? 'platform' : 'cross-platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60000,
        attestation: 'none',
      },
      message: 'Call navigator.credentials.create() with this options object, then POST result with action=webauthn-register-complete',
    })
  }

  // Complete WebAuthn registration
  if (body.action === 'webauthn-register-complete') {
    const device: WebauthnDevice = {
      id: `wa-${Date.now()}`,
      userId,
      credentialId: body.credentialId ?? crypto.randomBytes(32).toString('base64url'),
      publicKey: body.publicKey ?? 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...',
      counter: 0,
      transports: body.transports ?? ['internal'],
      deviceType: body.transports?.includes('internal') ? 'platform' : 'cross-platform',
      name: body.name ?? 'WebAuthn Device',
      enrolledAt: new Date().toISOString(),
      lastUsedAt: null,
    }
    WEBAUTHN_DEVICES.push(device)
    try {
      await db.auditLog.create({
        data: { action: 'mfa-enroll', entity: 'auth', entityId: device.id, details: JSON.stringify({ method: 'webauthn', userId, deviceType: device.deviceType }) },
      })
    } catch {}
    return NextResponse.json({ ok: true, device, message: `WebAuthn device "${device.name}" enrolled` })
  }

  // Step-up authentication
  if (body.action === 'step-up') {
    const method = body.method ?? 'totp'
    const valid = method === 'totp' ? /^\d{6}$/.test(body.code ?? '') : method === 'webauthn' ? !!body.assertion : method === 'backup-code' ? !!body.backupCode : false
    if (!valid) {
      return NextResponse.json({ ok: false, error: 'Invalid step-up credential' }, { status: 401 })
    }
    const now = Date.now()
    const session: StepUpSession = {
      userId,
      authenticatedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + STEP_UP_TTL_MS).toISOString(),
      method: method as StepUpSession['method'],
    }
    // Replace any existing session
    const idx = STEP_UP_SESSIONS.findIndex((s) => s.userId === userId)
    if (idx >= 0) STEP_UP_SESSIONS[idx] = session
    else STEP_UP_SESSIONS.push(session)
    try {
      await db.auditLog.create({
        data: { action: 'mfa-stepup', entity: 'auth', entityId: userId, details: JSON.stringify({ method, expiresAt: session.expiresAt }) },
      })
    } catch {}
    return NextResponse.json({
      ok: true,
      stepUp: session,
      message: `Step-up authentication valid for ${STEP_UP_TTL_MS / 1000}s — destructive actions now permitted`,
    })
  }

  // Disable MFA
  if (body.action === 'disable') {
    const idx = TOTP_ENROLLMENTS.findIndex((t) => t.userId === userId)
    if (idx >= 0) TOTP_ENROLLMENTS.splice(idx, 1)
    const waIdx = WEBAUTHN_DEVICES.findIndex((w) => w.id === body.deviceId)
    if (waIdx >= 0) WEBAUTHN_DEVICES.splice(waIdx, 1)
    return NextResponse.json({ ok: true, message: 'MFA device removed' })
  }

  return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 })
}
