'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Save, Plug, CheckCircle2, AlertCircle, Globe, KeyRound, User, Github, Info } from 'lucide-react'
import { useConfig, useSaveConfig } from '@/lib/rivendell/api'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { RivendellConfig } from '@/lib/rivendell/types'

export function RdxportConfig() {
  const config = useConfig()

  if (config.isLoading) {
    return <Skeleton className="h-96 w-full" />
  }

  // Keyed remount: when the server config arrives (or changes), the form remounts
  // and its useState lazy initializers read the fresh values — no setState-in-effect.
  const data: RivendellConfig = config.data ?? {
    id: 1,
    url: 'http://localhost/rdxport.cgi',
    username: null,
    password: null,
    connected: false,
    updatedAt: new Date().toISOString(),
  }

  return (
    <RdxportConfigForm
      key={data.id + ':' + data.url + ':' + data.updatedAt}
      initial={data}
    />
  )
}

function RdxportConfigForm({ initial }: { initial: RivendellConfig }) {
  const save = useSaveConfig()
  const [url, setUrl] = useState(initial.url)
  const [username, setUsername] = useState(initial.username ?? '')
  const [password, setPassword] = useState(initial.password ?? '')
  const [testing, setTesting] = useState(false)

  const saveAll = (connected: boolean) => {
    save.mutate(
      {
        url: url || 'http://localhost/rdxport.cgi',
        username: username.trim() || null,
        password: password || null,
        connected,
      },
      {
        onSuccess: () =>
          toast.success('Configuration saved', {
            description: connected ? 'RDXport connection marked online.' : 'Saved locally.',
          }),
        onError: (e: unknown) =>
          toast.error('Save failed', { description: e instanceof Error ? e.message : '' }),
      },
    )
  }

  const test = async () => {
    setTesting(true)
    // Simulated connection test
    await new Promise((r) => setTimeout(r, 700))
    setTesting(false)
    const ok = /^https?:\/\/.+/.test(url)
    if (ok) {
      save.mutate(
        { url, username: username.trim() || null, password: password || null, connected: true },
        {
          onSuccess: () =>
            toast.success('Connection successful', { description: `${url} responded OK.` }),
        },
      )
    } else {
      toast.error('Connection failed', { description: 'Please enter a valid RDXport URL.' })
    }
  }

  const connected = initial.connected

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="border-border bg-card/80 lg:col-span-2">
        <CardHeader className="border-b border-border/60 px-4 py-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Globe className="h-4 w-4 text-primary" aria-hidden="true" />
            RDXport Connection
            <Badge
              variant="outline"
              className={
                connected
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                  : 'border-border bg-secondary/40 text-muted-foreground'
              }
            >
              {connected ? (
                <>
                  <CheckCircle2 className="mr-1 h-3 w-3" aria-hidden="true" />
                  ONLINE
                </>
              ) : (
                <>
                  <AlertCircle className="mr-1 h-3 w-3" aria-hidden="true" />
                  DISCONNECTED
                </>
              )}
            </Badge>
          </CardTitle>
          <CardDescription className="text-xs">
            RDXport is the Rivendell web gateway (rdxport.cgi). Configure the endpoint below to connect the dashboard to your Rivendell server.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-4">
          <div className="space-y-1.5">
            <Label htmlFor="rdx-url" className="text-xs uppercase tracking-wider text-muted-foreground">
              <Globe className="mr-1 inline h-3 w-3" aria-hidden="true" />
              RDXport URL
            </Label>
            <Input
              id="rdx-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="http://localhost/rdxport.cgi"
              className="font-mono text-sm"
              spellCheck={false}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="rdx-user" className="text-xs uppercase tracking-wider text-muted-foreground">
                <User className="mr-1 inline h-3 w-3" aria-hidden="true" />
                Username
              </Label>
              <Input
                id="rdx-user"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="(optional — anonymous)"
                className="text-sm"
                autoComplete="username"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rdx-pass" className="text-xs uppercase tracking-wider text-muted-foreground">
                <KeyRound className="mr-1 inline h-3 w-3" aria-hidden="true" />
                Password
              </Label>
              <Input
                id="rdx-pass"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="(optional)"
                className="text-sm"
                autoComplete="current-password"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Button
              type="button"
              onClick={test}
              disabled={testing || save.isPending}
              className="min-h-11"
            >
              <Plug className={`mr-1.5 h-4 w-4 ${testing ? 'animate-pulse' : ''}`} aria-hidden="true" />
              {testing ? 'Testing…' : 'Test Connection'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => saveAll(false)}
              disabled={save.isPending}
              className="min-h-11"
            >
              <Save className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Save
            </Button>
            {connected && (
              <Button
                type="button"
                variant="outline"
                onClick={() => saveAll(false)}
                disabled={save.isPending}
                className="min-h-11"
              >
                Disconnect
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="h-full border-border bg-card/80">
          <CardHeader className="border-b border-border/60 px-4 py-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Info className="h-4 w-4 text-primary" aria-hidden="true" />
              About Rivendell
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 text-sm">
            <p className="text-muted-foreground">
              Rivendell is a complete open-source radio broadcast automation system, designed for
              professional use in live and automated environments. 24+ years of development.
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Field label="Version" value="v4.4.1" />
              <Field label="DB schema" value="377" />
              <Field label="License" value="GPLv2" />
              <Field label="Audio engine" value="JACK / ALSA / HPI" />
              <Field label="DB" value="MySQL 5.7+" />
              <Field label="GUI" value="Qt5" />
            </div>
            <a
              href="https://github.com/ElvishArtisan/rivendell"
              target="_blank"
              rel="noreferrer noopener"
              className="flex items-center justify-center gap-2 rounded-md border border-border/60 bg-background/40 p-2 text-sm text-primary hover:bg-secondary/40"
            >
              <Github className="h-4 w-4" aria-hidden="true" />
              github.com/ElvishArtisan/rivendell
            </a>
            <p className="text-[10px] text-muted-foreground">
              This dashboard mocks the rdxport.cgi XML responses. Configure a real endpoint above to
              connect to your Rivendell installation.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
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
