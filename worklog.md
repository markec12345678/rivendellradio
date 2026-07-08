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
