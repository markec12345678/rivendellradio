import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface SnmpDevice {
  id: string
  name: string
  type: 'transmitter' | 'encoder' | 'processor' | 'mixer' | 'rds-encoder' | 'dab-mux' | 'stream-server'
  ip: string
  port: number
  community: string
  status: 'online' | 'offline' | 'warning' | 'critical'
  uptime: number
  oids: Array<{ oid: string; name: string; value: string; unit: string; status: 'normal' | 'warning' | 'critical' }>
}

const devices: SnmpDevice[] = [
  {
    id: 'tx-1', name: 'FM Transmitter (RVR T60)', type: 'transmitter', ip: '192.168.10.1', port: 161, community: 'public',
    status: 'online', uptime: 8642000,
    oids: [
      { oid: '1.3.6.1.2.1.1.3.0', name: 'System Uptime', value: '100d 2h 33m', unit: '', status: 'normal' },
      { oid: '1.3.6.1.4.1.9.9.13.1.3.1.3', name: 'Output Power', value: '580', unit: 'W', status: 'normal' },
      { oid: '1.3.6.1.4.1.9.9.13.1.3.2.3', name: 'Forward Power', value: '600', unit: 'W', status: 'normal' },
      { oid: '1.3.6.1.4.1.9.9.13.1.3.3.3', name: 'Reflected Power', value: '20', unit: 'W', status: 'normal' },
      { oid: '1.3.6.1.4.1.9.9.13.1.3.4.3', name: 'VSWR', value: '1.2', unit: ':1', status: 'normal' },
      { oid: '1.3.6.1.4.1.9.9.13.1.3.5.3', name: 'Temperature', value: '42', unit: '°C', status: 'normal' },
      { oid: '1.3.6.1.4.1.9.9.13.1.3.6.3', name: 'PA Voltage', value: '48', unit: 'V', status: 'normal' },
    ],
  },
  {
    id: 'enc-1', name: 'RDS Encoder (Inovonics 730)', type: 'rds-encoder', ip: '192.168.50.10', port: 161, community: 'public',
    status: 'online', uptime: 8642000,
    oids: [
      { oid: '1.3.6.1.2.1.1.3.0', name: 'System Uptime', value: '100d 2h 33m', unit: '', status: 'normal' },
      { oid: '1.3.6.1.4.1.20931.1.1', name: 'PI Code', value: '887F', unit: '', status: 'normal' },
      { oid: '1.3.6.1.4.1.20931.1.2', name: 'PS Name', value: 'ROCK887', unit: '', status: 'normal' },
      { oid: '1.3.6.1.4.1.20931.1.3', name: 'RDS Signal', value: 'Active', unit: '', status: 'normal' },
      { oid: '1.3.6.1.4.1.20931.1.4', name: 'Audio Level L', value: '-12', unit: 'dBFS', status: 'normal' },
      { oid: '1.3.6.1.4.1.20931.1.5', name: 'Audio Level R', value: '-14', unit: 'dBFS', status: 'normal' },
    ],
  },
  {
    id: 'dab-1', name: 'DAB+ Multiplexer', type: 'dab-mux', ip: '192.168.50.20', port: 161, community: 'public',
    status: 'warning', uptime: 3600000,
    oids: [
      { oid: '1.3.6.1.2.1.1.3.0', name: 'System Uptime', value: '41d 16h', unit: '', status: 'normal' },
      { oid: '1.3.6.1.4.1.50000.1.1', name: 'Bitrate', value: '96', unit: 'kbps', status: 'normal' },
      { oid: '1.3.6.1.4.1.50000.1.2', name: 'FEC', value: '1/2', unit: '', status: 'normal' },
      { oid: '1.3.6.1.4.1.50000.1.3', name: 'Error Rate', value: '0.003', unit: '%', status: 'warning' },
      { oid: '1.3.6.1.4.1.50000.1.4', name: 'SYNC Status', value: 'OK', unit: '', status: 'normal' },
      { oid: '1.3.6.1.4.1.50000.1.5', name: 'Services Active', value: '3', unit: '', status: 'normal' },
    ],
  },
  {
    id: 'proc-1', name: 'Audio Processor (Omnia 9)', type: 'processor', ip: '192.168.10.5', port: 161, community: 'public',
    status: 'online', uptime: 8642000,
    oids: [
      { oid: '1.3.6.1.2.1.1.3.0', name: 'System Uptime', value: '100d 2h', unit: '', status: 'normal' },
      { oid: '1.3.6.1.4.1.30000.1.1', name: 'Input Level L', value: '-8', unit: 'dBFS', status: 'normal' },
      { oid: '1.3.6.1.4.1.30000.1.2', name: 'Input Level R', value: '-9', unit: 'dBFS', status: 'normal' },
      { oid: '1.3.6.1.4.1.30000.1.3', name: 'Output Level L', value: '-3', unit: 'dBFS', status: 'normal' },
      { oid: '1.3.6.1.4.1.30000.1.4', name: 'Output Level R', value: '-3', unit: 'dBFS', status: 'normal' },
      { oid: '1.3.6.1.4.1.30000.1.5', name: 'Loudness', value: '-16', unit: 'LUFS', status: 'normal' },
    ],
  },
  {
    id: 'stream-1', name: 'Icecast2 Stream Server', type: 'stream-server', ip: '192.168.20.1', port: 161, community: 'public',
    status: 'online', uptime: 8642000,
    oids: [
      { oid: '1.3.6.1.2.1.1.3.0', name: 'System Uptime', value: '100d 2h', unit: '', status: 'normal' },
      { oid: '1.3.6.1.4.1.40000.1.1', name: 'Total Listeners', value: '1788', unit: '', status: 'normal' },
      { oid: '1.3.6.1.4.1.40000.1.2', name: 'Bandwidth', value: '342', unit: 'Mbps', status: 'normal' },
      { oid: '1.3.6.1.4.1.40000.1.3', name: 'Mountpoints', value: '3', unit: '', status: 'normal' },
      { oid: '1.3.6.1.4.1.40000.1.4', name: 'CPU Usage', value: '23', unit: '%', status: 'normal' },
    ],
  },
  {
    id: 'mixer-1', name: 'Studer Vista 1 Mixer', type: 'mixer', ip: '192.168.10.10', port: 161, community: 'public',
    status: 'offline', uptime: 0,
    oids: [
      { oid: '1.3.6.1.2.1.1.3.0', name: 'System Uptime', value: '0', unit: '', status: 'critical' },
    ],
  },
]

export async function GET() {
  await new Promise((r) => setTimeout(r, 120))
  const online = devices.filter((d) => d.status === 'online').length
  const warnings = devices.filter((d) => d.status === 'warning').length
  const critical = devices.filter((d) => d.status === 'offline' || d.status === 'critical').length
  const totalOids = devices.reduce((acc, d) => acc + d.oids.length, 0)

  return NextResponse.json({
    count: devices.length,
    online,
    warnings,
    critical,
    totalOids,
    healthScore: Math.round(((online * 100 + warnings * 50) / (devices.length * 100)) * 100),
    devices: devices.map((d) => ({
      ...d,
      uptimeFormatted: d.uptime > 0 ? `${Math.floor(d.uptime / 86400000)}d ${Math.floor((d.uptime % 86400000) / 3600000)}h` : 'offline',
    })),
  })
}
