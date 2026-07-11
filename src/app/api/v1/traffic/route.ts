import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Traffic & Billing summary endpoint.
 *
 * Shows the full ad lifecycle: insertion orders → contracts → avails → as-run → make-goods → invoices.
 * Pair with /api/v1/affidavit for proof-of-play PDFs and /api/v1/traffic/bxf for SMPTE 2021 BXF v3.1.
 *
 * GET /api/v1/traffic         — dashboard summary (advertisers, contracts, revenue, fill rate)
 */

interface Advertiser {
  id: string
  name: string
  contactEmail: string
  contractsCount: number
  totalBilledUsd: number
  totalSpots: number
  makeGoodRate: number
}

interface Contract {
  id: string
  advertiserId: string
  advertiserName: string
  startDate: string
  endDate: string
  totalSpots: number
  deliveredSpots: number
  remainingSpots: number
  ratePerSpot: number
  totalValue: number
  billedValue: number
  status: 'active' | 'completed' | 'pending' | 'overdue'
}

interface Avail {
  id: string
  timeSlot: string
  daypart: string
  durationSec: number
  rate: number
  status: 'sold' | 'available' | 'hold' | 'ros'
  advertiserId?: string
  advertiserName?: string
  isci?: string
}

const ADVERTISERS: Advertiser[] = [
  { id: 'adv-001', name: 'Pepsi', contactEmail: 'media@pepsi.com', contractsCount: 3, totalBilledUsd: 28450, totalSpots: 247, makeGoodRate: 2.4 },
  { id: 'adv-002', name: 'Coca-Cola', contactEmail: 'media@coca-cola.com', contractsCount: 2, totalBilledUsd: 19500, totalSpots: 178, makeGoodRate: 1.8 },
  { id: 'adv-003', name: 'Local Auto Dealer', contactEmail: 'ads@localauto.com', contractsCount: 4, totalBilledUsd: 12400, totalSpots: 312, makeGoodRate: 4.2 },
  { id: 'adv-004', name: 'City Bank', contactEmail: 'marketing@citybank.com', contractsCount: 1, totalBilledUsd: 8200, totalSpots: 89, makeGoodRate: 0.5 },
]

const CONTRACTS: Contract[] = [
  { id: 'CNT-2026-042', advertiserId: 'adv-001', advertiserName: 'Pepsi', startDate: '2026-07-01', endDate: '2026-07-31', totalSpots: 120, deliveredSpots: 87, remainingSpots: 33, ratePerSpot: 150, totalValue: 18000, billedValue: 13050, status: 'active' },
  { id: 'CNT-2026-043', advertiserId: 'adv-002', advertiserName: 'Coca-Cola', startDate: '2026-07-01', endDate: '2026-07-15', totalSpots: 80, deliveredSpots: 80, remainingSpots: 0, ratePerSpot: 175, totalValue: 14000, billedValue: 14000, status: 'completed' },
  { id: 'CNT-2026-044', advertiserId: 'adv-003', advertiserName: 'Local Auto Dealer', startDate: '2026-07-10', endDate: '2026-08-10', totalSpots: 200, deliveredSpots: 42, remainingSpots: 158, ratePerSpot: 65, totalValue: 13000, billedValue: 2730, status: 'active' },
  { id: 'CNT-2026-045', advertiserId: 'adv-004', advertiserName: 'City Bank', startDate: '2026-07-05', endDate: '2026-07-20', totalSpots: 60, deliveredSpots: 45, remainingSpots: 15, ratePerSpot: 120, totalValue: 7200, billedValue: 5400, status: 'active' },
]

const AVAILS_TODAY: Avail[] = [
  { id: 'avail-001', timeSlot: '06:00', daypart: 'morning-drive', durationSec: 30, rate: 175, status: 'sold', advertiserId: 'adv-001', advertiserName: 'Pepsi', isci: 'PEPSI2026A001H' },
  { id: 'avail-002', timeSlot: '06:15', daypart: 'morning-drive', durationSec: 30, rate: 175, status: 'available' },
  { id: 'avail-003', timeSlot: '07:00', daypart: 'morning-drive', durationSec: 30, rate: 200, status: 'sold', advertiserId: 'adv-002', advertiserName: 'Coca-Cola', isci: 'COKE2026A003H' },
  { id: 'avail-004', timeSlot: '07:30', daypart: 'morning-drive', durationSec: 15, rate: 95, status: 'ros' },
  { id: 'avail-005', timeSlot: '08:00', daypart: 'morning-drive', durationSec: 30, rate: 225, status: 'sold', advertiserId: 'adv-001', advertiserName: 'Pepsi', isci: 'PEPSI2026A001H' },
  { id: 'avail-006', timeSlot: '12:00', daypart: 'midday', durationSec: 30, rate: 125, status: 'available' },
  { id: 'avail-007', timeSlot: '14:00', daypart: 'midday', durationSec: 30, rate: 130, status: 'hold', advertiserId: 'adv-003', advertiserName: 'Local Auto Dealer' },
  { id: 'avail-008', timeSlot: '16:30', daypart: 'afternoon-drive', durationSec: 30, rate: 195, status: 'sold', advertiserId: 'adv-004', advertiserName: 'City Bank', isci: 'CITY2026A002H' },
  { id: 'avail-009', timeSlot: '18:00', daypart: 'afternoon-drive', durationSec: 30, rate: 210, status: 'available' },
  { id: 'avail-010', timeSlot: '22:00', daypart: 'overnight', durationSec: 30, rate: 65, status: 'ros' },
]

export async function GET() {
  await new Promise((r) => setTimeout(r, 100))

  const totalBilled = ADVERTISERS.reduce((s, a) => s + a.totalBilledUsd, 0)
  const totalSpots = ADVERTISERS.reduce((s, a) => s + a.totalSpots, 0)
  const totalMakeGoods = ADVERTISERS.reduce((s, a) => s + Math.round(a.totalSpots * a.makeGoodRate / 100), 0)
  const soldAvails = AVAILS_TODAY.filter((a) => a.status === 'sold').length
  const availableAvails = AVAILS_TODAY.filter((a) => a.status === 'available' || a.status === 'ros').length
  const fillRate = AVAILS_TODAY.length > 0 ? Math.round((soldAvails / AVAILS_TODAY.length) * 100) : 0

  return NextResponse.json({
    summary: {
      totalAdvertisers: ADVERTISERS.length,
      activeContracts: CONTRACTS.filter((c) => c.status === 'active').length,
      totalBilledUsd: totalBilled,
      totalSpots,
      totalMakeGoods,
      makeGoodRate: totalSpots > 0 ? Math.round((totalMakeGoods / totalSpots) * 1000) / 10 : 0,
      fillRate,
      soldAvails,
      availableAvails,
      avgRatePerSpot: Math.round(AVAILS_TODAY.reduce((s, a) => s + a.rate, 0) / AVAILS_TODAY.length),
    },
    advertisers: ADVERTISERS,
    contracts: CONTRACTS,
    availsToday: AVAILS_TODAY,
    pipeline: {
      stages: ['Insertion Order', 'Contract', 'Avails', 'As-Run', 'Make-Good', 'Invoice'],
      currentMonthRevenue: totalBilled,
      projectedMonthEnd: Math.round(totalBilled * 1.4),
      collectionRate: 94.2,
    },
    integrations: {
      bxf: {
        standard: 'SMPTE 2021 BXF v3.1',
        endpoint: '/api/v1/traffic/bxf',
        description: 'Import schedules + export as-runs to WideOrbit/Marketron/Natural Log',
        status: 'active',
      },
      affidavit: {
        endpoint: '/api/v1/affidavit',
        description: 'Proof-of-play PDF z HMAC signature',
        status: 'active',
      },
      quickbooks: {
        format: 'IIF (Intuit Interchange Format)',
        description: 'Invoice export za QuickBooks',
        status: 'available',
      },
    },
  })
}
