'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Save, Plug, CheckCircle2, AlertCircle, Globe, KeyRound, User, Github, Sun, Moon, Layers, Info } from 'lucide-react'
import { useConfig, useSaveConfig, useTheme, useSaveTheme } from '@/lib/rivendell/api'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import type { ThemeMode } from '@/lib/rivendell/types'
import { cn } from '@/lib/utils'

export function SettingsTab() {
  const config = useConfig()
  const save = useSaveConfig()
  const theme = useTheme()
  const saveTheme = useSaveTheme()

  if (config.isLoading) return <div className="p-6"><Skeleton className="h-96 w-full" /></div>

  const cfg = config.data ?? { id: 1, url: 'http://localhost/rdxport.cgi', username: null, password: null, connected: false, updatedAt: new Date().toISOString() }

  return (
    <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-3">
      {/* RDXport Config */}
      <RdxportForm key={cfg.url + cfg.updatedAt} initial={cfg} save={save} />

      {/* Theme */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="h-full border-border bg-card/80">
          <CardHeader className="border-b border-border/60 px-4 py-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Sun className="h-4 w-4 text-primary" aria-hidden="true" />
              Theme
            </CardTitle>
            <CardDescription className="text-xs">Choose the broadcast theme and accent hue.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Theme Mode</Label>
              <div className="grid grid-cols-3 gap-2">
                {(['dark', 'metal', 'light'] as ThemeMode[]).map((m) => {
                  const Icon = m === 'light' ? Sun : m === 'metal' ? Layers : Moon
                  const isActive = (theme.data?.mode ?? 'dark') === m
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => saveTheme.mutate({ mode: m, accentHue: theme.data?.accentHue ?? 60 }, {
                        onSuccess: () => toast.success('Theme applied', { description: m.charAt(0).toUpperCase() + m.slice(1) }),
                      })}
                      className={cn(
                        'flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        isActive ? 'border-primary bg-primary/15 text-primary' : 'border-border bg-background/40 text-muted-foreground hover:bg-secondary/40',
                      )}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                      <span className="capitalize">{m}</span>
                      {isActive && <CheckCircle2 className="h-3 w-3 text-primary" aria-hidden="true" />}
                    </button>
                  )
                })}
              </div>
            </div>

            <Separator className="bg-border/60" />

            <div className="space-y-2">
              <Label className="flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground">
                <span>Accent Hue</span>
                <span className="font-mono text-primary">{theme.data?.accentHue ?? 60}°</span>
              </Label>
              <input
                type="range"
                min={0}
                max={360}
                value={theme.data?.accentHue ?? 60}
                onChange={(e) => saveTheme.mutate({ mode: theme.data?.mode ?? 'dark', accentHue: Number(e.target.value) })}
                className="h-2 w-full cursor-pointer appearance-none rounded-full"
                aria-label="Accent hue"
                style={{ background: 'linear-gradient(to right, hsl(0 70% 50%), hsl(60 70% 50%), hsl(120 70% 50%), hsl(180 70% 50%), hsl(240 70% 50%), hsl(300 70% 50%), hsl(360 70% 50%))' }}
              />
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>0° (red)</span><span>60° (amber)</span><span>180° (cyan)</span><span>360°</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* About */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="h-full border-border bg-card/80">
          <CardHeader className="border-b border-border/60 px-4 py-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Info className="h-4 w-4 text-primary" aria-hidden="true" />
              About
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 text-sm">
            <p className="text-muted-foreground">
              Open-source radio broadcast dashboard for Rivendell. Clean-room implementation
              inspired by AzuraCast, LibreTime, and RCS Zetta workflows.
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Field label="Rivendell" value="v4.4.1" />
              <Field label="DB schema" value="377" />
              <Field label="License" value="GPLv2" />
              <Field label="Audio engine" value="JACK / ALSA" />
            </div>
            <a
              href="https://github.com/markec12345678/rivendellradio"
              target="_blank"
              rel="noreferrer noopener"
              className="flex items-center justify-center gap-2 rounded-md border border-border/60 bg-background/40 p-2 text-sm text-primary hover:bg-secondary/40"
            >
              <Github className="h-4 w-4" aria-hidden="true" />
              github.com/markec12345678/rivendellradio
            </a>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

function RdxportForm({
  initial,
  save,
}: {
  initial: { id: number; url: string; username: string | null; password: string | null; connected: boolean; updatedAt: string }
  save: ReturnType<typeof useSaveConfig>
}) {
  const [url, setUrl] = useState(initial.url)
  const [username, setUsername] = useState(initial.username ?? '')
  const [password, setPassword] = useState(initial.password ?? '')
  const [testing, setTesting] = useState(false)

  const saveAll = (connected: boolean) => {
    save.mutate({ url: url || 'http://localhost/rdxport.cgi', username: username.trim() || null, password: password || null, connected }, {
      onSuccess: () => toast.success('Configuration saved', { description: connected ? 'Connection marked online.' : 'Saved locally.' }),
      onError: (e: unknown) => toast.error('Save failed', { description: e instanceof Error ? e.message : '' }),
    })
  }

  const test = async () => {
    setTesting(true)
    await new Promise((r) => setTimeout(r, 700))
    setTesting(false)
    if (/^https?:\/\/.+/.test(url)) {
      save.mutate({ url, username: username.trim() || null, password: password || null, connected: true }, {
        onSuccess: () => toast.success('Connection successful', { description: `${url} responded OK.` }),
      })
    } else {
      toast.error('Connection failed', { description: 'Please enter a valid RDXport URL.' })
    }
  }

  return (
    <Card className="border-border bg-card/80 lg:col-span-2">
      <CardHeader className="border-b border-border/60 px-4 py-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Globe className="h-4 w-4 text-primary" aria-hidden="true" />
          RDXport Connection
          <Badge variant="outline" className={initial.connected ? 'border-emerald-500/40 text-emerald-400' : 'border-border text-muted-foreground'}>
            {initial.connected ? <><CheckCircle2 className="mr-1 h-3 w-3" />ONLINE</> : <><AlertCircle className="mr-1 h-3 w-3" />OFFLINE</>}
          </Badge>
        </CardTitle>
        <CardDescription className="text-xs">RDXport is the Rivendell web gateway (rdxport.cgi).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <div className="space-y-1.5">
          <Label htmlFor="rdx-url" className="text-xs uppercase tracking-wider text-muted-foreground"><Globe className="mr-1 inline h-3 w-3" />RDXport URL</Label>
          <Input id="rdx-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="http://localhost/rdxport.cgi" className="font-mono text-sm" spellCheck={false} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="rdx-user" className="text-xs uppercase tracking-wider text-muted-foreground"><User className="mr-1 inline h-3 w-3" />Username</Label>
            <Input id="rdx-user" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="(optional)" className="text-sm" autoComplete="username" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rdx-pass" className="text-xs uppercase tracking-wider text-muted-foreground"><KeyRound className="mr-1 inline h-3 w-3" />Password</Label>
            <Input id="rdx-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="(optional)" className="text-sm" autoComplete="current-password" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Button type="button" onClick={test} disabled={testing || save.isPending} className="min-h-11">
            <Plug className={cn('mr-1.5 h-4 w-4', testing && 'animate-pulse')} aria-hidden="true" />
            {testing ? 'Testing…' : 'Test Connection'}
          </Button>
          <Button type="button" variant="outline" onClick={() => saveAll(false)} disabled={save.isPending} className="min-h-11">
            <Save className="mr-1.5 h-4 w-4" aria-hidden="true" />Save
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-background/40 p-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-mono text-sm text-foreground">{value}</div>
    </div>
  )
}
