import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { Toaster as SonnerToaster } from '@/components/ui/sonner'
import { QueryProvider } from '@/lib/query-provider'
import { ThemeProvider } from '@/components/rivendell/theme-provider'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Rock 88.7 — Broadcast Control Center',
  description: 'Radio broadcast automation dashboard — clean-room implementation inspired by AzuraCast, LibreTime, and RCS Zetta.',
  keywords: ['radio', 'automation', 'broadcast', 'playout', 'rock', 'dashboard'],
  icons: { icon: 'https://z-cdn.chatglm.cn/z-ai/static/logo.svg' },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark theme-dark" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}>
        <QueryProvider>
          <ThemeProvider>
            {children}
            <SonnerToaster richColors position="bottom-right" />
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
