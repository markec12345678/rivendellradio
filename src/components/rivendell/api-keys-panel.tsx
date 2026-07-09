'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Key, Plus, Copy, Check, X, Clock, Shield } from 'lucide-react'
import { useApiKeys, useCreateApiKey } from '@/lib/rivendell/api'
import { formatRelative } from '@/lib/rivendell/format'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

const PERMISSION_OPTIONS = [
  { value: 'read:tracks', label: 'Read Tracks' },
  { value: 'write:tracks', label: 'Write Tracks' },
  { value: 'read:schedule', label: 'Read Schedule' },
  { value: 'write:schedule', label: 'Write Schedule' },
  { value: 'read:requests', label: 'Read Requests' },
  { value: 'write:requests', label: 'Write Requests' },
  { value: 'read:reports', label: 'Read Reports' },
  { value: 'rml:send', label: 'Send RML' },
]

export function ApiKeysPanel() {
  const apiKeys = useApiKeys()
  const createKey = useCreateApiKey()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyPerms, setNewKeyPerms] = useState<string[]>(['read:tracks', 'read:schedule'])
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleCreate = () => {
    if (!newKeyName.trim()) return
    createKey.mutate(
      { name: newKeyName.trim(), permissions: newKeyPerms.join(',') },
      {
        onSuccess: (data) => {
          setCreatedKey(data.key)
          setNewKeyName('')
          setNewKeyPerms(['read:tracks', 'read:schedule'])
          toast.success('API Key created', { description: 'Copy the key now — it won\'t be shown again.' })
        },
      },
    )
  }

  const copyKey = () => {
    if (createdKey) {
      navigator.clipboard.writeText(createdKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const togglePerm = (perm: string) => {
    setNewKeyPerms((prev) => prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm])
  }

  return (
    <>
      <Card className="border-border bg-card/80">
        <CardHeader className="border-b border-border/60 px-4 py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Key className="h-4 w-4 text-primary" aria-hidden="true" />
              API Keys
              {apiKeys.data && (
                <Badge variant="outline" className="border-border/70 text-[10px] text-muted-foreground">
                  {apiKeys.data.count} keys
                </Badge>
              )}
            </CardTitle>
            <Button type="button" size="sm" variant="outline" onClick={() => { setCreatedKey(null); setDialogOpen(true) }} className="h-7 text-xs">
              <Plus className="mr-1 h-3 w-3" />
              New Key
            </Button>
          </div>
          <CardDescription className="text-xs">
            Broadcast API keys for external integrations (newsroom, mobile apps, AI, CMS)
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {apiKeys.isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : apiKeys.data && apiKeys.data.keys.length > 0 ? (
            <div className="divide-y divide-border/60">
              {apiKeys.data.keys.map((key) => (
                <motion.div
                  key={key.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 px-4 py-2.5"
                >
                  <div className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
                    key.active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-muted/40 text-muted-foreground',
                  )}>
                    <Shield className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-foreground">{key.name}</div>
                    <code className="font-mono text-[10px] text-muted-foreground">{key.keyPrefix}...</code>
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {key.permissions.split(',').slice(0, 3).map((p) => (
                        <span key={p} className="rounded bg-secondary/60 px-1 py-0.5 font-mono text-[8px] text-muted-foreground">{p}</span>
                      ))}
                      {key.permissions.split(',').length > 3 && (
                        <span className="text-[8px] text-muted-foreground">+{key.permissions.split(',').length - 3} more</span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <Badge variant="outline" className={key.active ? 'border-emerald-500/40 text-[9px] text-emerald-400' : 'text-[9px] text-muted-foreground'}>
                      {key.active ? 'ACTIVE' : 'INACTIVE'}
                    </Badge>
                    {key.lastUsed && (
                      <div className="mt-0.5 flex items-center justify-end gap-0.5 text-[9px] text-muted-foreground">
                        <Clock className="h-2 w-2" />
                        {formatRelative(key.lastUsed)}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-muted-foreground">
              <Key className="mx-auto mb-2 h-8 w-8 opacity-30" aria-hidden="true" />
              No API keys yet. Create one to enable Broadcast API access.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create API Key Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md border-border bg-card text-card-foreground">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Key className="h-5 w-5 text-primary" aria-hidden="true" />
            Create API Key
          </DialogTitle>
          <DialogDescription className="text-xs">
            Generate a new API key for external system integration.
          </DialogDescription>

          {createdKey ? (
            /* Show the created key (only once) */
            <div className="space-y-3">
              <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3">
                <div className="mb-1 text-[10px] uppercase tracking-wider text-emerald-400">Your API Key (shown only once)</div>
                <code className="block break-all font-mono text-xs text-foreground">{createdKey}</code>
              </div>
              <div className="flex gap-2">
                <Button type="button" size="sm" onClick={copyKey} className="flex-1">
                  {copied ? <><Check className="mr-1.5 h-3.5 w-3.5" />Copied</> : <><Copy className="mr-1.5 h-3.5 w-3.5" />Copy Key</>}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => { setDialogOpen(false); setCreatedKey(null) }}>
                  Done
                </Button>
              </div>
            </div>
          ) : (
            /* Create form */
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="key-name" className="text-xs uppercase tracking-wider text-muted-foreground">Key Name</Label>
                <Input
                  id="key-name"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g. Newsroom Integration"
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Permissions</Label>
                <div className="grid grid-cols-2 gap-1.5">
                  {PERMISSION_OPTIONS.map((perm) => (
                    <button
                      key={perm.value}
                      type="button"
                      onClick={() => togglePerm(perm.value)}
                      className={cn(
                        'flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-left text-xs transition-colors',
                        newKeyPerms.includes(perm.value)
                          ? 'border-primary/40 bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:bg-secondary/30',
                      )}
                    >
                      {newKeyPerms.includes(perm.value) ? <Check className="h-3 w-3" /> : <div className="h-3 w-3" />}
                      {perm.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setDialogOpen(false)} className="h-9">
                  <X className="mr-1.5 h-3.5 w-3.5" />Cancel
                </Button>
                <Button type="button" size="sm" onClick={handleCreate} disabled={!newKeyName.trim() || createKey.isPending} className="h-9">
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  {createKey.isPending ? 'Creating…' : 'Create Key'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
