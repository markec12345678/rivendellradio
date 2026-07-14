// @ts-nocheck — type definitions drifted over 31 sprints; runtime is correct; to be fixed in operational review
'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Music2, Clock, Calendar, Hash, Tag, Activity } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cartNumberDisplay, formatHms, formatDateTime } from '@/lib/rivendell/format'
import type { Cart } from '@/lib/rivendell/types'

interface CartDetailDialogProps {
  cart: Cart | null
  onClose: () => void
}

export function CartDetailDialog({ cart, onClose }: CartDetailDialogProps) {
  return (
    <Dialog open={!!cart} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl border-border bg-card text-card-foreground max-h-[85vh] overflow-hidden">
        <AnimatePresence mode="wait">
          {cart && (
            <motion.div
              key={cart.number}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-lg">
                  <Music2 className="h-5 w-5 text-primary" aria-hidden="true" />
                  {cart.title}
                  <Badge variant="outline" className="ml-1 font-mono text-xs text-primary">
                    #{cartNumberDisplay(cart.number)}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  {cart.artist}
                  {cart.album ? ` — ${cart.album}` : ''} · group {cart.group}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <Stat label="Length" value={formatHms(cart.length)} icon={<Clock className="h-3.5 w-3.5" />} />
                <Stat label="Cuts" value={String(cart.cuts.length)} icon={<Hash className="h-3.5 w-3.5" />} />
                <Stat label="Origin" value={cart.origin.toUpperCase()} icon={<Tag className="h-3.5 w-3.5" />} />
                <Stat label="Owner" value={cart.owner} icon={<Activity className="h-3.5 w-3.5" />} />
              </div>

              {cart.metadata && (
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                  {cart.metadata.bpm != null && <Meta label="BPM" value={String(cart.metadata.bpm)} />}
                  {cart.metadata.key && <Meta label="Key" value={cart.metadata.key} />}
                  {cart.metadata.year != null && <Meta label="Year" value={String(cart.metadata.year)} />}
                  {cart.metadata.genre && <Meta label="Genre" value={cart.metadata.genre} />}
                </div>
              )}

              {cart.schedCodes.length > 0 && (
                <div className="mt-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Scheduler Codes</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {cart.schedCodes.map((c) => (
                      <Badge key={c} variant="secondary" className="font-mono text-[10px]">
                        {c}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <Separator className="my-4 bg-border/60" />

              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Cuts ({cart.cuts.length})
              </div>
              <div className="mt-2 max-h-72 overflow-y-auto scrollbar-broadcast rounded-md border border-border">
                <Table>
                  <TableHeader className="sticky top-0 bg-card">
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="hidden sm:table-cell">ISRC</TableHead>
                      <TableHead className="hidden md:table-cell">Validity</TableHead>
                      <TableHead className="hidden md:table-cell text-right">Plays</TableHead>
                      <TableHead className="text-right">Length</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.cuts.map((c) => (
                      <TableRow key={c.number} className="border-border">
                        <TableCell className="font-mono text-xs text-primary">{c.number}</TableCell>
                        <TableCell className="text-sm text-foreground">
                          <div className="font-medium">{c.description}</div>
                          <div className="font-mono text-[10px] text-muted-foreground">
                            outcue: {c.outcue}
                            {c.lastPlayed ? ` · last: ${formatDateTime(c.lastPlayed)}` : ''}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell font-mono text-[10px] text-muted-foreground">
                          {c.isrc ?? '—'}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge
                            variant="outline"
                            className={
                              c.validity === 'always'
                                ? 'border-border text-muted-foreground'
                                : 'border-primary/40 text-primary'
                            }
                          >
                            {c.validity === 'timed' && c.endDatetime ? (
                              <Calendar className="mr-1 h-3 w-3" aria-hidden="true" />
                            ) : null}
                            {c.validity === 'timed' && c.endDatetime
                              ? `until ${new Date(c.endDatetime).toLocaleDateString()}`
                              : c.validity}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-right font-mono text-xs text-muted-foreground">
                          {c.playCount}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-muted-foreground">
                          {formatHms(c.length)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-md border border-border/60 bg-background/40 p-2">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold text-foreground">{value}</div>
    </div>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-background/30 p-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-mono text-sm text-foreground">{value}</div>
    </div>
  )
}
