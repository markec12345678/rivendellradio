'use client'

import { Database, HardDrive, Server, Cpu, Network, Globe } from 'lucide-react'
import { useSystemSettings } from '@/lib/rivendell/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

export function SystemSettingsCard() {
  const settings = useSystemSettings()

  if (settings.isLoading) {
    return <Skeleton className="h-64 w-full" />
  }
  if (settings.isError || !settings.data) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="py-8 text-center text-sm text-destructive">
          Failed to load system settings.
        </CardContent>
      </Card>
    )
  }

  const s = settings.data

  return (
    <Card className="border-border bg-card/80">
      <CardHeader className="border-b border-border/60 px-4 py-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Database className="h-4 w-4 text-primary" aria-hidden="true" />
          System Settings
          <Badge variant="outline" className="ml-2 font-mono text-[10px] text-primary">
            DB schema {s.dbSchemaVersion}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Rivendell version" value={s.rivendellVersion} icon={<Server className="h-3.5 w-3.5" />} />
        <Field label="Sample rate" value={`${(s.sampleRate / 1000).toFixed(1)} kHz`} icon={<Cpu className="h-3.5 w-3.5" />} />
        <Field label="Realm" value={s.realm} icon={<Globe className="h-3.5 w-3.5" />} />
        <Field label="Audio root" value={s.audioRoot} icon={<HardDrive className="h-3.5 w-3.5" />} mono />
        <Field label="Temp cart group" value={s.tempCartGroup} icon={<Database className="h-3.5 w-3.5" />} mono />
        <Field label="DB schema version" value={String(s.dbSchemaVersion)} icon={<Database className="h-3.5 w-3.5" />} mono />
        <Field label="Hostname" value={s.hostName} icon={<Server className="h-3.5 w-3.5" />} mono />
        <Field label="MySQL server" value={s.mySqlServer} icon={<Database className="h-3.5 w-3.5" />} mono />
        <Field label="JACK client name" value={s.jackClientName} icon={<Network className="h-3.5 w-3.5" />} mono />
        <Field label="SASL realm" value={s.saslRealm} icon={<Globe className="h-3.5 w-3.5" />} mono />
        <Field label="Primary CAE" value={s.primaryCae} icon={<Cpu className="h-3.5 w-3.5" />} mono />
        <Field label="Backup CAE" value={s.backupCae ?? '—'} icon={<Cpu className="h-3.5 w-3.5" />} mono />
      </CardContent>
    </Card>
  )
}

function Field({
  label,
  value,
  icon,
  mono,
}: {
  label: string
  value: string
  icon: React.ReactNode
  mono?: boolean
}) {
  return (
    <div className="rounded-md border border-border/60 bg-background/40 p-2.5">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className={`mt-0.5 text-sm text-foreground ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  )
}
