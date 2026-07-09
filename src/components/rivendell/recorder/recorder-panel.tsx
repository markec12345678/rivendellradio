'use client'

import { motion } from 'framer-motion'
import {
  Disc3,
  Radio,
  Mic,
  Satellite,
  Activity,
  Clock,
  Plus,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Circle,
  HardDrive,
  Signal,
  type LucideIcon,
} from 'lucide-react'
import { useRecordings } from '@/lib/rivendell/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import type { Recording, RecordingFeed, RecordingStatus, RecordingType, RecordingSource } from '@/lib/rivendell/types'
import { cn } from '@/lib/utils'

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

const statusConfig: Record<RecordingStatus, { label: string; color: string; icon: LucideIcon }> = {
  scheduled: { label: 'SCHEDULED', color: 'border-blue-500/40 bg-blue-500/10 text-blue-400', icon: Clock },
  recording: { label: 'RECORDING', color: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400', icon: Disc3 },
  completed: { label: 'COMPLETED', color: 'border-border bg-secondary/40 text-muted-foreground', icon: CheckCircle2 },
  failed: { label: 'FAILED', color: 'border-destructive/40 bg-destructive/10 text-destructive', icon: XCircle },
  idle: { label: 'IDLE', color: 'border-border bg-secondary/40 text-muted-foreground', icon: Circle },
  skipped: { label: 'SKIPPED', color: 'border-amber-500/40 bg-amber-500/10 text-amber-400', icon: AlertCircle },
}

const typeIcon: Record<RecordingType, LucideIcon> = {
  satellite: Satellite,
  show: Disc3,
  live: Radio,
  'voice-track': Mic,
  emergency: AlertCircle,
}

const sourceIcon: Record<RecordingSource, LucideIcon> = {
  satellite: Satellite,
  'line-in': Signal,
  stream: Radio,
  mic: Mic,
  aes67: Activity,
}

export function RecorderPanel() {
  const rec = useRecordings()

  if (rec.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!rec.data) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Failed to load recorder status.
        </CardContent>
      </Card>
    )
  }

  const d = rec.data
  const storagePct = d.totalStorageMb > 0 ? (d.storageUsedMb / d.totalStorageMb) * 100 : 0

  return (
    <div className="space-y-4">
      {/* Status banner */}
      <RecorderStatusBanner
        count={d.count}
        activeNow={d.activeNow}
        nextInMin={d.nextInMin}
        storageUsedMb={d.storageUsedMb}
        totalStorageMb={d.totalStorageMb}
        storagePct={storagePct}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Recordings table */}
        <section aria-label="Scheduled recordings" className="lg:col-span-2">
          <SectionHeader
            icon={Disc3}
            title="Scheduled Recordings"
            subtitle={`${d.count} recordings · ${d.activeNow} active now`}
            action={
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => toast.info('New Recording', { description: 'Recording scheduler would open the rdcatch dialog.' })}
              >
                <Plus className="mr-1 h-3 w-3" aria-hidden="true" />
                New
              </Button>
            }
          />
          <Card className="border-border bg-card/80">
            <CardContent className="p-0">
              <ScrollArea className="max-h-[55vh]">
                <div className="divide-y divide-border/60">
                  {d.recordings.map((r, idx) => (
                    <RecordingRow key={r.id} recording={r} idx={idx} />
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </section>

        {/* Active feeds */}
        <section aria-label="Recording feeds">
          <SectionHeader
            icon={Signal}
            title="Active Feeds"
            subtitle={`${d.feeds.filter((f) => f.active).length} of ${d.feeds.length} feeds active`}
          />
          <Card className="border-border bg-card/80">
            <CardContent className="p-0">
              <div className="divide-y divide-border/60">
                {d.feeds.map((feed) => (
                  <FeedRow key={feed.id} feed={feed} />
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------------

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  action,
}: {
  icon: LucideIcon
  title: string
  subtitle: string
  action?: React.ReactNode
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card/60">
          <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {action}
    </div>
  )
}

function RecorderStatusBanner({
  count,
  activeNow,
  nextInMin,
  storageUsedMb,
  totalStorageMb,
  storagePct,
}: {
  count: number
  activeNow: number
  nextInMin: number | null
  storageUsedMb: number
  totalStorageMb: number
  storagePct: number
}) {
  return (
    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <Card className="overflow-hidden border-primary/30 bg-gradient-to-br from-card/90 to-card/60">
        <CardHeader className="border-b border-border/60 bg-primary/5 px-4 py-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Disc3 className="h-4 w-4 text-primary" aria-hidden="true" />
            Background Recorder
            {activeNow > 0 && (
              <Badge variant="outline" className="gap-1 border-emerald-500/40 text-[10px] text-emerald-400">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
                {activeNow} RECORDING
              </Badge>
            )}
          </CardTitle>
          <CardDescription className="text-xs">
            Scheduled capture of satellite feeds, shows, and live remotes — RDCatch equivalent.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
          <Stat label="Scheduled" value={String(count)} icon={Clock} />
          <Stat label="Active now" value={String(activeNow)} icon={Disc3} />
          <Stat label="Next in" value={nextInMin != null ? `${nextInMin}m` : '—'} icon={Activity} />
          <Stat label="Storage" value={`${formatGb(storageUsedMb)} / ${formatGb(totalStorageMb)}`} icon={HardDrive} />
        </CardContent>
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Storage used</span>
            <span className={cn('font-mono', storagePct > 85 ? 'text-destructive' : 'text-foreground')}>
              {storagePct.toFixed(1)}%
            </span>
          </div>
          <Progress value={storagePct} className="mt-1 h-1.5" />
        </div>
      </Card>
    </motion.div>
  )
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: LucideIcon }) {
  return (
    <div className="rounded-md border border-border/60 bg-background/40 p-2.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" aria-hidden="true" />
        {label}
      </div>
      <div className="mt-1 font-mono text-sm font-semibold text-foreground">{value}</div>
    </div>
  )
}

function RecordingRow({ recording, idx }: { recording: Recording; idx: number }) {
  const st = statusConfig[recording.status]
  const StIcon = st.icon
  const TIcon = typeIcon[recording.type]
  const SIcon = sourceIcon[recording.source]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.03 }}
      className={cn(
        'flex flex-wrap items-center gap-3 px-4 py-2.5',
        recording.status === 'recording' && 'bg-emerald-500/5',
        recording.status === 'failed' && 'bg-destructive/5',
      )}
    >
      {/* Status icon */}
      <div className="shrink-0">
        <StIcon
          className={cn(
            'h-4 w-4',
            recording.status === 'recording' && 'animate-spin text-emerald-400',
            recording.status === 'scheduled' && 'text-blue-400',
            recording.status === 'completed' && 'text-muted-foreground',
            recording.status === 'failed' && 'text-destructive',
            recording.status === 'idle' && 'text-muted-foreground',
          )}
          aria-hidden="true"
        />
      </div>

      {/* Type + source icons */}
      <div className="flex shrink-0 items-center gap-1">
        <TIcon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
        <SIcon className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
      </div>

      {/* Name + description */}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-foreground">{recording.name}</div>
        <div className="truncate text-[10px] text-muted-foreground">{recording.description}</div>
      </div>

      {/* Schedule */}
      <div className="shrink-0 text-right">
        <div className="flex items-center gap-1 font-mono text-xs text-foreground">
          <Clock className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
          {recording.startTime}
        </div>
        <div className="font-mono text-[10px] text-muted-foreground">{formatDuration(recording.duration)}</div>
      </div>

      {/* Days of week */}
      <div className="hidden shrink-0 items-center gap-0.5 sm:flex">
        {DAYS.map((d, i) => (
          <span
            key={d}
            className={cn(
              'flex h-4 w-4 items-center justify-center rounded text-[8px] font-mono',
              recording.daysOfWeek.includes(i)
                ? 'bg-primary/20 text-primary'
                : 'bg-secondary/30 text-muted-foreground/40',
            )}
          >
            {d[0]}
          </span>
        ))}
      </div>

      {/* Destination cart */}
      <div className="hidden shrink-0 font-mono text-[10px] text-muted-foreground md:block">
        → #{String(recording.destinationCart).padStart(6, '0')}/{recording.destinationCut}
      </div>

      <Separator orientation="vertical" className="hidden h-5 bg-border/60 sm:block" />

      {/* Status badge */}
      <Badge variant="outline" className={cn('shrink-0 text-[10px]', st.color)}>
        {st.label}
      </Badge>

      {/* File size or next time */}
      <div className="shrink-0 text-right">
        {recording.status === 'recording' ? (
          <span className="font-mono text-[10px] text-emerald-400">{formatMb(recording.fileSizeMb)} MB</span>
        ) : recording.nextRecording ? (
          <span className="font-mono text-[10px] text-muted-foreground">
            next: {new Date(recording.nextRecording).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        ) : (
          <span className="font-mono text-[10px] text-muted-foreground">{formatMb(recording.fileSizeMb)} MB</span>
        )}
      </div>
    </motion.div>
  )
}

function FeedRow({ feed }: { feed: RecordingFeed }) {
  const SIcon = sourceIcon[feed.source]
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <SIcon className={cn('h-3.5 w-3.5 shrink-0', feed.active ? 'text-primary' : 'text-muted-foreground')} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm text-foreground">{feed.name}</div>
        <code className="truncate font-mono text-[10px] text-muted-foreground">{feed.url}</code>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <Badge
          variant="outline"
          className={cn(
            'text-[9px]',
            feed.active
              ? 'border-emerald-500/40 text-emerald-400'
              : 'border-border text-muted-foreground',
          )}
        >
          {feed.active ? 'ACTIVE' : 'OFFLINE'}
        </Badge>
        {feed.active && (
          <div className="flex items-center gap-1">
            <Signal className="h-2.5 w-2.5 text-emerald-400" aria-hidden="true" />
            <span className="font-mono text-[9px] text-muted-foreground">
              {Math.round(feed.signalLevel * 100)}%
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------------

function formatDuration(ms: number): string {
  const totalMin = Math.floor(ms / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h > 0) return `${h}h${String(m).padStart(2, '0')}`
  return `${m}m`
}

function formatMb(mb: number): string {
  if (mb === 0) return '0'
  if (mb < 1024) return String(mb)
  return (mb / 1024).toFixed(1)
}

function formatGb(mb: number): string {
  return (mb / 1024).toFixed(1) + ' GB'
}
