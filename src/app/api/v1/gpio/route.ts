import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface GpioLine {
  id: number
  name: string
  type: 'input' | 'output'
  state: boolean
  driver: string
  device: string
  mapping?: string // katera akcija je povezana
  description: string
}

const gpioInputs: GpioLine[] = [
  { id: 0, name: 'Studio ON-AIR Button', type: 'input', state: true, driver: 'serial', device: 'Studio Console A', mapping: 'fader_start_main', description: 'Console fader start — starts Main playout' },
  { id: 1, name: 'Mic 1 Live (Studio A)', type: 'input', state: false, driver: 'serial', device: 'Mic Panel A', mapping: 'on_air_light', description: 'Mic 1 open — triggers ON AIR lamp' },
  { id: 2, name: 'Mic 2 Live (Studio A)', type: 'input', state: false, driver: 'serial', device: 'Mic Panel A', mapping: 'on_air_light', description: 'Mic 2 open — triggers ON AIR lamp' },
  { id: 3, name: 'Doorbell / Studio Entry', type: 'input', state: false, driver: 'serial', device: 'Door Sensor', mapping: 'notification', description: 'Door bell — shows notification in dashboard' },
  { id: 4, name: 'EAS Alert Trigger', type: 'input', state: false, driver: 'gpio', device: 'EAS Receiver', mapping: 'eas_override', description: 'EAS alert — overrides playout with emergency audio' },
  { id: 5, name: 'Network Failover', type: 'input', state: false, driver: 'gpio', device: 'Network Monitor', mapping: 'failover', description: 'Primary network down — switch to backup' },
  { id: 6, name: 'Fader Start (Console B)', type: 'input', state: true, driver: 'livewire', device: 'Studio Console B', mapping: 'fader_start_aux', description: 'Console B fader — starts Aux playout' },
  { id: 7, name: 'PTT Footswitch', type: 'input', state: false, driver: 'gpio', device: 'Floor Switch', mapping: 'mic_override', description: 'Push-to-talk footswitch — opens mic over playout' },
]

const gpioOutputs: GpioLine[] = [
  { id: 0, name: 'ON-AIR Lamp (Red)', type: 'output', state: true, driver: 'serial', device: 'Studio A Lamp', description: 'Red ON-AIR lamp — on when mic is open or playout active' },
  { id: 1, name: 'Studio B Cue Light', type: 'output', state: false, driver: 'serial', device: 'Studio B Lamp', description: 'Cue light for Studio B' },
  { id: 2, name: 'EAS Relay', type: 'output', state: false, driver: 'gpio', device: 'EAS Relay Box', description: 'EAS relay — triggers emergency broadcast chain' },
  { id: 3, name: 'Automation Bypass', type: 'output', state: false, driver: 'gpio', device: 'Bypass Relay', description: 'Bypasses automation — routes console directly to transmitter' },
  { id: 4, name: 'Silence Detector Alarm', type: 'output', state: false, driver: 'gpio', device: 'Silence Sensor', description: 'Alarm when audio silence detected (>10s)' },
  { id: 5, name: 'Backup Transmitter Switch', type: 'output', state: false, driver: 'gpio', device: 'TX Switch', description: 'Switches to backup transmitter on primary failure' },
  { id: 6, name: 'Now-Playing Sign', type: 'output', state: true, driver: 'serial', device: 'Studio Display', description: 'Now-playing display in studio lobby' },
  { id: 7, name: 'Remote Start / Record Light', type: 'output', state: false, driver: 'gpio', device: 'Record Indicator', description: 'Recording indicator light' },
]

export async function GET() {
  await new Promise((r) => setTimeout(r, 100))
  return NextResponse.json({
    inputs: gpioInputs,
    outputs: gpioOutputs,
    activeInputs: gpioInputs.filter((g) => g.state).length,
    activeOutputs: gpioOutputs.filter((g) => g.state).length,
    total: gpioInputs.length + gpioOutputs.length,
    drivers: ['serial', 'gpio', 'livewire', 'kernel-gpio'],
  })
}
