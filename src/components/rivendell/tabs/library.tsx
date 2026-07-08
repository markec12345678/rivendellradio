'use client'

import { useState } from 'react'
import { Search, Music, Plus } from 'lucide-react'
import { useTracks } from '@/lib/rivendell/api'
import { formatHms, formatRelative } from '@/lib/rivendell/format'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

const groupColors: Record<string, string> = {
  MUSIC: 'border-primary/40 text-primary',
  JINGLES: 'border-emerald-500/40 text-emerald-400',
  ADS: 'border-accent/40 text-accent',
  PROMOS: 'border-purple-500/40 text-purple-400',
}

export function LibraryTab() {
  const [search, setSearch] = useState('')
  const [group, setGroup] = useState('ALL')
  const tracks = useTracks(search, group)

  const groups = ['ALL', 'MUSIC', 'JINGLES', 'ADS', 'PROMOS']

  return (
    <div className="p-4 sm:p-6">
      <Card className="border-border bg-card/80">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tracks by title, artist, album…"
                className="h-10 pl-9"
                aria-label="Search tracks"
              />
            </div>
            <div className="flex items-center gap-1">
              {groups.map((g) => (
                <Button
                  key={g}
                  type="button"
                  variant={group === g ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setGroup(g)}
                  className="h-9 px-2.5 text-xs"
                >
                  {g}
                </Button>
              ))}
            </div>
            <Button type="button" onClick={() => toast.info('Import', { description: 'Track import would open the rdxport endpoint.' })} className="h-9">
              <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
              Import
            </Button>
          </div>

          <div className="rounded-md border border-border">
            <div className="max-h-[65vh] overflow-y-auto scrollbar-broadcast">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card">
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="w-20">Art</TableHead>
                    <TableHead className="w-16">ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead className="hidden md:table-cell">Artist</TableHead>
                    <TableHead className="hidden lg:table-cell">Album</TableHead>
                    <TableHead>Group</TableHead>
                    <TableHead className="hidden sm:table-cell">Genre</TableHead>
                    <TableHead className="text-right">Length</TableHead>
                    <TableHead className="hidden lg:table-cell">Last Played</TableHead>
                    <TableHead className="text-right">Plays</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tracks.isLoading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={`sk-${i}`} className="border-border">
                        <TableCell colSpan={10}><Skeleton className="h-7 w-full" /></TableCell>
                      </TableRow>
                    ))
                  ) : tracks.data && tracks.data.tracks.length > 0 ? (
                    tracks.data.tracks.map((track) => (
                      <TableRow
                        key={track.id}
                        className="cursor-pointer border-border transition-colors hover:bg-secondary/40"
                        onClick={() => toast.info(track.title, { description: `${track.artist} · ${formatHms(track.length)}` })}
                      >
                        <TableCell>
                          <div className="h-10 w-10 shrink-0 overflow-hidden rounded">
                            <img
                              src={track.albumArt ?? '/album-art/rock-1.png'}
                              alt=""
                              className="h-full w-full object-cover"
                              onError={(e) => { ;(e.target as HTMLImageElement).style.opacity = '0' }}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-[10px] text-muted-foreground">{track.id}</TableCell>
                        <TableCell className="font-medium text-foreground">
                          <div className="flex items-center gap-1.5">
                            <Music className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
                            <span className="truncate">{track.title}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">{track.artist}</TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground">{track.album}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn('font-mono text-[10px]', groupColors[track.group] ?? 'border-border text-muted-foreground')}>
                            {track.group}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{track.genre}</TableCell>
                        <TableCell className="text-right font-mono text-xs text-muted-foreground">{formatHms(track.length)}</TableCell>
                        <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{formatRelative(track.lastPlayed ?? null)}</TableCell>
                        <TableCell className="text-right font-mono text-xs text-muted-foreground">{track.playCount.toLocaleString()}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow className="border-border">
                      <TableCell colSpan={10} className="py-12 text-center text-sm text-muted-foreground">
                        No tracks found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{tracks.data ? `${tracks.data.count} of ${tracks.data.total} tracks` : 'Loading…'}</span>
            <span>Click a row for details</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
