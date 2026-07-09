import { NextResponse } from 'next/server'
import { mockGpio } from '@/lib/rivendell/mock-data'

export const dynamic = 'force-dynamic'

export async function GET() {
  await new Promise((r) => setTimeout(r, 150))
  const inputs = mockGpio.filter((g) => g.direction === 'input')
  const outputs = mockGpio.filter((g) => g.direction === 'output')
  return NextResponse.json({
    inputs,
    outputs,
    activeCount: mockGpio.filter((g) => g.state).length,
    total: mockGpio.length,
  })
}
