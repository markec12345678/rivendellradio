# Rock 88.7 — Broadcast Control Center

Open-source radio broadcast automation dashboard for the [Rivendell Radio Automation System](https://github.com/ElvishArtisan/rivendell). Clean-room implementation inspired by AzuraCast (MIT), LibreTime (AGPL), and RCS Zetta (commercial UI concepts only).

## Features

### 7 Dashboard Tabs
- **Dashboard** — Now Playing hero with album art, real-time waveform, soundpanel (F1-F8), Recently Played, Top Tracks
- **Library** — 38 real rock tracks with album art thumbnails, search, row highlighting (Zetta 3-layer color system)
- **Schedule** — Today's shows list + Weekly Timetable grid (7-day) + drag-drop log editor (@dnd-kit)
- **Streams** — Multi-station listener stats with real-time WebSocket updates
- **Reports** — 24h listener analytics (area/line/bar charts, recharts)
- **System** — Studio Clock, daemons grid with real-time CPU/memory, WebSocket feed status
- **Settings** — RDXport connection config, 3 themes (Dark/Metal/Light), accent hue slider

### Professional Features
- **Command Palette** (Cmd+K) — navigate, search tracks, quick actions
- **Real-time WebSocket** — VU meters (10Hz), now-playing (5s), listeners (1s), daemon load (2s)
- **Keyboard shortcuts** — F1-F8 soundpanel, Space play, Esc emergency stop, D/L/S tabs, R RML, ? help
- **Now Playing dialog** — full track metadata (BPM, ISRC, year, genre, play count)
- **Drag-drop log editor** — reorder, add, delete, transition cycling, save with dirty state
- **Mobile responsive** — drawer navigation with hamburger menu
- **Detached Playout badge** — safety indicator (Zetta-inspired)
- **RML command console** — terminal in footer with history (↑/↓)

### Tech Stack
- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4 + shadcn/ui (New York)
- **Database**: Prisma ORM (SQLite)
- **State**: React Query (server) + Zustand (client)
- **Real-time**: Socket.io WebSocket mini-service (port 3003)
- **Charts**: Recharts
- **Drag-drop**: @dnd-kit/sortable
- **Icons**: Lucide React

## Clean-Room Implementation

This dashboard is a clean-room implementation:
- **No third-party code copied** — all code is original
- **UI concepts inspired by** AzuraCast (MIT), LibreTime (AGPL), RCS Zetta (commercial — UI patterns only)
- **Last code written** in React/TypeScript/Tailwind — never copied from reference systems
- **Real track metadata** used for library (publicly available information)
- **AI-generated album art** (no copyright issues)

## Getting Started

### Prerequisites
- Node.js 18+ / Bun
- SQLite (included)

### Installation
```bash
bun install
bun run db:push    # Create database schema
bun run dev        # Start Next.js dev server (port 3000)
```

### Start WebSocket mini-service
```bash
cd mini-services/broadcast-feed
bun install
bun run dev        # Start WebSocket server (port 3003)
```

### Keyboard shortcuts
- `Cmd+K` / `Ctrl+K` — Command Palette
- `F1-F8` — Fire soundpanel buttons
- `Space` — Play Main log machine
- `Esc` — Emergency stop all
- `D` / `L` / `S` — Switch to Dashboard / Library / Schedule
- `R` — Focus RML command console
- `?` — Show keyboard help

## License

GPLv2 (same as upstream Rivendell)

## Acknowledgments

- [Rivendell Radio Automation](https://github.com/ElvishArtisan/rivendell) — the core automation system
- [AzuraCast](https://github.com/AzuraCast/AzuraCast) — MIT-licensed web radio suite (UI inspiration)
- [LibreTime](https://github.com/libretime/libretime) — AGPL-licensed radio automation (concepts)
- [RCS Zetta](https://www.rcsworks.com/zetta) — commercial reference (UI patterns only, clean-room)
- [EBU awesome-broadcasting](https://github.com/ebu/awesome-broadcasting) — curated broadcast resources
