import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ROLE_PERMISSIONS, ROLE_LABELS, type UserRole } from '@/lib/rivendell/types'

export const dynamic = 'force-dynamic'

const DEFAULT_USERS = [
  { username: 'admin', email: 'admin@rock887.fm', fullName: 'System Admin', role: 'admin' as UserRole },
  { username: 'mike', email: 'mike@rock887.fm', fullName: 'DJ Mike Stevens', role: 'presenter' as UserRole },
  { username: 'sarah', email: 'sarah@rock887.fm', fullName: 'Sarah Johnson', role: 'program-director' as UserRole },
  { username: 'alex', email: 'alex@rock887.fm', fullName: 'Alex Chen', role: 'presenter' as UserRole },
  { username: 'chris', email: 'chris@rock887.fm', fullName: 'Chris Davis', role: 'producer' as UserRole },
  { username: 'engineer', email: 'eng@rock887.fm', fullName: 'Pat Murphy', role: 'technical-engineer' as UserRole },
  { username: 'scheduler', email: 'sched@rock887.fm', fullName: 'Lisa Park', role: 'music-scheduler' as UserRole },
]

async function ensureUsers() {
  try {
    const count = await db.user.count()
    if (count === 0) {
      for (const u of DEFAULT_USERS) {
        await db.user.create({ data: u })
      }
    }
  } catch {}
}

export async function GET() {
  await ensureUsers()
  await new Promise((r) => setTimeout(r, 100))
  try {
    const users = await db.user.findMany({ orderBy: { createdAt: 'asc' } })
    const usersWithRoles = users.map((u) => ({
      ...u,
      roleLabel: ROLE_LABELS[u.role as UserRole] ?? u.role,
      permissions: ROLE_PERMISSIONS[u.role as UserRole] ?? [],
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
    }))
    return NextResponse.json({ count: usersWithRoles.length, users: usersWithRoles })
  } catch {
    return NextResponse.json({ count: 0, users: [] })
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  try {
    const user = await db.user.create({
      data: {
        username: body.username,
        email: body.email ?? null,
        fullName: body.fullName ?? null,
        role: body.role ?? 'read-only',
      },
    })
    // Audit log
    await db.auditLog.create({
      data: { action: 'create', entity: 'user', entityId: user.id, details: JSON.stringify({ username: user.username, role: user.role }) },
    })
    return NextResponse.json({ ok: true, user })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}
