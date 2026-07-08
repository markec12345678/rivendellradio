# Rivendell Web Dashboard — Worklog

## Projekt
Moderni Next.js 16 nadzorni center za Rivendell Radio Automation.
Clean-room implementacija, navdih od AzuraCast (MIT), LibreTime (AGPL — študij konceptov),
RCS Zetta (komercialni — samo UI koncepti, lastna koda/barve/ikone).

## Pravna podlaga
- UI layouti in funkcionalna logika niso avtorsko zaščiteni (Lotus v. Borland, Oracle v. Google)
- Clean room metoda: opazovanje → specifikacija → implementacija brez vnosa originala
- Lastna barvna paleta (dark + amber), Lucide ikone (open-source), shadcn/ui komponente
- Brez kopiranja kode — samo koncepti

---
Task ID: 0
Agent: lead
Task: Pripravitev delovnega okolja po izgubi podatkov

Work Log:
- Preveril stanje: vse custom datoteke izgubljene (OOM kill + filesystem corruption)
- Git initialized, .gitignore pravilen (node_modules, .next ignorirani)
- Dev server teče na :3000 (webpack mode, NODE_OPTIONS=--max-old-space-size=1024)
- Strategija: 5 zavihkov po AzuraCast vzorcu + WebSocket real-time
- Git commit po vsakem koraku kot varnostna kopija

Stage Summary:
- Stack: Next.js 16 + TS + Tailwind 4 + shadcn/ui + Prisma + React Query + Zustand
- Teme: dark broadcast studio (oklch, amber akcenti)
- 5 zavihkov: Dashboard, Library, Schedule, Streams, Settings

---
Task ID: rebuild-1
Agent: lead
Task: Clean-room obnova dashboarda po izgubi podatkov + GitHub backup

Work Log:
- Preveril stanje: vse custom datoteke izgubljene (OOM kill)
- Prisma shema: RivendellConfig, ActiveStation, ThemePreference
- Tipi: Track, Station, ScheduleShow, Daemon, NowPlaying, WebSocket frames
- Real rock tracks: 30 pravih pesmi (AC/DC, Queen, Nirvana, Foo Fighters, Muse, Linkin Park, etc.) + jingles + ads
- 3 postaje: Rock 88.7 FM, Web HD, Mobile
- 5 današnjih show-ov (Morning Drive → Late Night Rock)
- 9 API rut: status, tracks, stations, schedule, daemons, config, theme, airplay, rml
- WebSocket mini-service (port 3003): VU 10Hz, now-playing 5s, listeners 1s, daemon-load 2s
- React Query hooks + Zustand store za live state
- Header: live clock, station switcher, theme switcher, ON-AIR badge, Detached Playout badge
- Sidebar: 5 zavihkov (Dashboard, Library, Schedule, Streams, Settings)
- Footer: RML command console z history
- Dashboard: Now Playing hero + VU meter + split-layout (live show log + station listeners)
- Library: tracks tabela z search + group filter (real rock pesmi)
- Schedule: show kartice z log lines (LIVE show highlighted)
- Streams: multi-station kartice z listener counts
- Settings: RDXport config + 3 Zetta themes + accent hue slider
- Lint: čist (0 napak, 0 opozoril)
- Git: committan na web-dashboard branch, pushan na GitHub
- Agent Browser: vsi 5 zavihki delujejo, 0 napak

Stage Summary:
- GitHub: github.com/markec12345678/rivendellradio (branch: web-dashboard)
- 25 datotek, ~3000 vrstic
- Real rock podatki (ne mock)
- WebSocket real-time (VU, now-playing, listeners)
- 3 teme + accent hue
- Clean-room implementacija (lastna koda, barve, ikone)

---
Task ID: waveform-shortcuts
Agent: lead
Task: Real-time waveform canvas + soundpanel + keyboard shortcuts

Work Log:
- WaveformDisplay komponenta (~200 vrstic): canvas-based scrolling stereo waveform
  - Rolling buffer 240 vzorcev (~24s @ 10Hz iz WebSocket VU frame-ov)
  - Peak hold z decay (0.985/frame)
  - dBFS mreža (-6, -12, -18, -24, -36 dB)
  - Gradient fill: green→amber→red glede na amplitudo
  - Playhead na desnem robu
  - 30 FPS redraw z requestAnimationFrame
  - ResizeObserver za responsive canvas
- SoundpanelGrid komponenta: 8 quick-fire gumbov (F1-F8)
  - 3 barve (amber/green/red)
  - framer-motion hover/tap animacije
  - F-label na vsakem gumbu
- useKeyboardShortcuts hook:
  - F1-F8: fire soundpanel buttons
  - Space: play Main log machine
  - Esc: emergency stop all
  - D/L/S: switch to Dashboard/Library/Schedule
  - R: focus RML command console
  - ?: show keyboard help toast
- Dashboard: waveform + soundpanel med stats in split-layout
- Lint: čist (0 napak)
- Agent Browser validacija:
  - Waveform canvas 675x140, aktivno riše
  - Soundpanel: 8 gumbov z F1-F8 label-i
  - F1: toast "F1: Station ID" + RML "PM 0 0!" prejet na serverju
  - ?: toast "F1-F8 soundpanel · Space play · Esc stop all..."
  - 0 napak v brskalniku

Stage Summary:
- 28 datotek, ~3500 vrstic
- Real-time waveform (canvas, 30 FPS, VU iz WebSocket)
- 8-button soundpanel z F1-F8 keyboard shortcutsi
- Polni keyboard shortcut sistem (F1-F8, Space, Esc, D/L/S, R, ?)

---
Task ID: reports-log-editor
Agent: lead
Task: Reports analytics tab + drag-drop log editor

Work Log:
- Reports API ruta: 24h listener history (hourly buckets, daypart pattern)
- useReports hook
- ReportsTab komponenta (~200 vrstic):
  - Area chart: total listeners 24h (gradient fill, recharts)
  - Line chart: per-station breakdown (multi-line, 3 stations)
  - Bar chart: station comparison (horizontal, current hour)
  - Stats: Current (2,272), Peak (2,531), Average (1,547), Active Streams (3)
  - Dark theme chart styling z oklch barvami
- LogEditorDialog komponenta (~350 vrstic):
  - @dnd-kit/sortable drag-drop reorder
  - Track palette z search (real rock tracks iz library-ja)
  - Transition cycling (PLAY/SEGUE/STOP/FADE)
  - Move up/down, delete, save z dirty state tracking
  - View/Edit mode toggle
  - ReadOnlyView tabela za view mode
- ScheduleTab: klik na show odpre LogEditorDialog
- Sidebar: dodan Reports zavihek (BarChart3 ikona)
- Page.tsx: 6 zavihkov (Dashboard, Library, Schedule, Streams, Reports, Settings)
- Lint: čist (0 napak)
- Agent Browser validacija:
  - Reports: 6 recharts grafov, realne statistike (2,272/2,531/1,547/3)
  - Log editor: drag handles prisotni, track palette z rock pesmimi
  - Add track: "Added to log: Back in Black — AC/DC" toast
  - Dirty state: "unsaved" badge se prikaže
  - Save: "Log saved" toast, dialog se zapre
  - 0 napak v brskalniku

Stage Summary:
- 6 zavihkov, 30+ datotek, ~4000 vrstic
- Real-time waveform + soundpanel + keyboard shortcuts
- Reports z recharts grafi (area/line/bar)
- Drag-drop log editor z @dnd-kit
- Vse na GitHub (web-dashboard branch)

---
Task ID: vlm-improvements
Agent: lead
Task: VLM-prioritetne izboljšave — album art + večji waveform

Work Log:
- Generiral 4 abstraktne album art naslovnice (AI, brez copyright-a):
  - rock-1.png (Hard Rock, Punk, Nu Metal, Jingle, Bed, Promo, PSA, Ad)
  - grunge-1.png (Grunge)
  - metal-1.png (Heavy Metal)
  - alt-1.png (Alternative Rock, Indie)
  - classic-1.png (Classic Rock)
- Track tip razširjen z albumArt poljem
- albumArtFor() helper: mapira žanr → naslovnica
- Dashboard hero: album art z vrtečo se Disc3 overlay (namesto same ikone)
- Library tabela: nov Art column z 40x40 thumbnaili (38 thumbnailov)
- Waveform povečan na 160px, full width (prej 140px v 2/3 širini)
- start.sh skripta za stabilen mini-service zagon
- Lint: čist
- VLM validacija:
  - "album art (lightning-themed with guitar) clearly visible"
  - "waveform significantly larger"
  - "cleaner, more cohesive layout"
  - "more professional"
  - Preostala mikro-poboljšanja: progress bar vidljivost, soundpanel kontrast

Stage Summary:
- Album art: DONE (VLM potrjeno)
- Večji waveform: DONE (VLM potrjeno)
- Library thumbnails: DONE (38 thumbnailov)
- VLM ocena: "more professional" kot prej
