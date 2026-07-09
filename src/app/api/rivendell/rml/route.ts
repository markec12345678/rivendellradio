import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const command = typeof body.command === 'string' ? body.command : ''
  console.log(`[rml] received: ${command}`)
  return NextResponse.json({ ok: true, command, received: new Date().toISOString(), message: 'RML command accepted' })
}
