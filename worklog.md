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
