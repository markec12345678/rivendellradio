# Rock 88.7 — Upgrade Roadmap (web research synthesis)

**Vir:** 23 spletnih iskanj (184 rezultatov) → 4 vzporedne sinteze → 81 konkretnih priložnosti
**Status:** vse priložnosti preverjene proti worklog.md (1502 vrstic) — brez prekrivanja z že implementiranim

---

## TL;DR — Top 10 hitre zmage (S/M effort, visok impact)

| # | Priložnost | Priority | Effort | Skupina |
|---|---|---|---|---|
| 1 | **Security Headers + CSP** (HSTS, nosniff, Referrer-Policy, Permissions-Policy) | High | **S** | Security |
| 2 | **Webhook Registry UI** (self-service CRUD + event catalog + test button) | Low | **S** | DX |
| 3 | **Audio Silence Detection + auto-failover** (dead-air zaščita) | High | **S** | Monitoring |
| 4 | **Automated Affidavit PDF** (proof-of-play za oglaševalce, HMAC podpis) | Medium | **S** | Traffic |
| 5 | **Podping.live** (Hive blockchain ping ob novi epizodi podcasta) | Low | **S** | Podcast |
| 6 | **EBU R128 / ITU-R BS.1770 LUFS metering** (-23 LUFS, -1 dBTP) | High | **M** | Monitoring |
| 7 | **SNMP Traps** (async push namesto polling — sub-sekundna odkritja) | High | **M** | Monitoring |
| 8 | **Grafana dashboards** (provisioning za obstoječi Prometheus) | High | **M** | Observability |
| 9 | **Prometheus Alertmanager** (PagerDuty/Slack/email routing) | High | **M** | Observability |
| 10 | **API Rate Limiting + IP Allowlisting** (RFC 7807 problem+json) | High | **M** | Security |

---

## Celotna mapa priložnosti (81)

### A. Radio Operations (22) — research-A
**Music scheduling:** A1 formal rule-based scheduler (GSelector natural demand), A2 separation matrix (artist/title/BPM/key), A3 category clock designer z daypart templates, A4 conflict avoidance (DMCA §114, brand-competitor, explicit-lyrics dayparting)
**Traffic & billing:** B1 Traffic & Billing tab (8. zavihek, full lifecycle), B2 SMPTE 2021 BXF v3.1 import/export, B3 dynamic placer engine, B4 affidavit PDF, B5 dynamic ad insertion (SCTE-35/HLS DAI)
**Podcast:** C1 podcast hosting + RSS 2.0 + podcast:2.0 namespace, C2 auto-distribution (Spotify/Apple/YouTube/Amazon), C3 podping.live, C4 video podcast
**Generative AI:** D1 voice cloning z consent registry + C2PA watermark, D2 multilingual AI news (ElevenLabs 29 jezikov), D3 context-aware voice link/sweeper generator, D4 speech enhancement + EBU R128 conformance (RNNoise/Demucs/ffmpeg loudnorm), D5 browser-based live voice tracking
**Playout/DR:** E1 Liquidsoap playout adapter, E2 acoustic fingerprinting (chromaprint/librosa/acoustid), E3 DR failover orchestrator (silence→backup studio→AI DJ fill→page engineer), E4 Listener CRM + persona segmentation

### B. Infrastructure (20) — research-B
**Streaming:** #1 HLS adaptive output (64/128/192k AAC), #2 SRT listener za remote contribution, #3 WebRTC WHEP sub-second web, #4 multi-codec pool (MP3/AAC+/Opus), #5 Liquidsoap source switcher + fallback
**Audio:** #6 LUFS/True-Peak metering, #7 24/7 loudness compliance log, #8 silence detection, #9 SNMP traps, #10 transmitter SNMP SET (power/mute/reset), #11 FM SNR reference receiver (RTL-SDR), #12 STL backup + auto-failover
**WebRTC:** #13 guest caller console (mediasoup/LiveKit, IFB mix-minus), #14 IFB/talkback cue bus
**Observability:** #15 Grafana provisioning, #16 Alertmanager, #17 Loki + Promtail log aggregation, #18 statistical anomaly detection (z-score/EWMA/Prophet), #19 Omnia 9 preset daypart automation, #20 Stereo Tool hot-spare processor

### C. UX/Engagement (19) — research-C
**UI/UX:** #1 WCAG AAA + reduced-motion + keyboard operability, #2 Framer Motion system, #3 density modes (operator/standard/presentation) + skeleton loaders
**Analytics:** #4 real-time geo-map (city-level pulses), #5 device/platform breakdown + daypart retention curves, #6 cohort retention heatmap + listener journey Sankey, #7 ATS/TTL metrics + benchmarks
**Voice tracking:** #8 in-browser VT (Web Audio + MediaRecorder), #9 waveform editor (wavesurfer.js) + take version control, #10 drag-to-log + smart segue auto-fit
**Social:** #11 unified multi-platform API (Ayrshare/Zernio — 13+ omrežij), #12 social calendar + AI captions/hashtags + optimal-time, #13 social ROI dashboard (UTM shortlinks)
**Mobile/PWA:** #14 PWA + Workbox service worker offline mode, #15 Web Push (VAPID) za hosts in listeners, #16 phone-as-remote (QR pairing + WebSocket)
**Engagement:** #17 live listener chat + moderated inbox, #18 polls + real-time song voting driving rotation, #19 loyalty/rewards + smart request queue + UGC portal

### D. Compliance/Security/Tech (22) — research-D
**Compliance:** #1 CAP 1.2 ingestion (OASIS + FEMA IPAWS-OPEN), #2 automatic EAS program interruption, #3 EAS encoder/decoder HW (DASDEC-III/SAGE ENDEC), #4 FCC EasLog 4-letno retencijo, #5 EBU Tech 3299 RDS validation, #6 DAB+ DLS+ Slideshow (ETSI TS 101 499 MOT), #7 SPI/DPI EPG + Service Following (ETSI TS 102 410)
**Collaboration:** #8 Yjs CRDT concurrent show editing (Google-Docs-style), #9 presence indicators + comments/annotations, #10 multi-stage approval workflows (kanban)
**Security:** #11 MFA (TOTP RFC 6238 + WebAuthn passkeys), #12 enterprise SSO (SAML 2.0 + OIDC), #13 rate limiting + IP allowlisting, #14 security headers + CSP, #15 secrets vault (Infisical) + SBOM (CycloneDX) + CVE scanning (trivy)
**EAS:** #16 CAP XML signature verification + replay protection, #17 webhook registry UI
**DX:** #18 Scalar API explorer + auto-generated SDK (openapi-typescript-codegen), #19 sandbox/dry-run mode (shadow broadcast pipeline)
**Next.js 16:** #20 Server Actions migration + React 19 hooks (useFormStatus, useOptimistic, use()), #21 React Compiler + Partial Prerendering + Streaming SSR
**DevOps:** #22 CI/CD + blue-green deploy + K8s probes + pino structured logging z correlationId

---

## Priporočen 6-sprint roadmap

### Sprint 1 — Varnostne osnove (2 tedna)
**Cilj:** zapreti najbolj akutne OWASP vrzeli in omogočiti varno javno eksponiranje.
- D14 Security Headers + CSP + report-uri (S)
- D13 API Rate Limiting + IP Allowlisting (M)
- D11 MFA TOTP + WebAuthn za admin/tech-engineer (L)
- D15 SBOM + dependency scanning v CI (M)

### Sprint 2 — EAS/CAP skladnost (3 tedne) — *regulatorna tveganja*
**Cilj:** FCC-compliant EAS pipeline od ingest do oddaje.
- D1 CAP 1.2 ingestion iz IPAWS-OPEN (L)
- D2 Automatic program interruption (fade → tones → TTS → restore) (L)
- D16 CAP XML signature verification + replay protection (M)
- D4 FCC EasLog z 4-letno retencijo (M)

### Sprint 3 — Infrastruktura in observability (3 tedne)
**Cilj:** broadcast-grade monitoring + audio compliance + failover.
- B6 EBU R128 LUFS metering (M)
- B7 24/7 loudness compliance log (M)
- B8 Silence detection + auto-failover (S)
- B9 SNMP traps (M)
- B15 Grafana dashboards (M)
- B16 Alertmanager (M)
- E3 DR failover orchestrator (L)

### Sprint 4 — Next.js 16 modernizacija (2 tedna) — *čist refactor*
**Cilj:** izkoristiti React 19 in Next.js 16 funkcionalnosti.
- D21 React Compiler + PPR + Streaming SSR (M)
- D20 Server Actions migration + useFormStatus/useOptimistic/use() (L)

### Sprint 5 — AI/Playout nadgradnje (4 tedne)
**Cilj:** produkcijsko razredna glasbena automatizacija + etični AI.
- A1 Formal rule-based music scheduler (L)
- A2 Separation matrix (M)
- A3 Category clock designer (M)
- D1 Voice cloning z consent registry + C2PA watermark (M)
- D4 Speech enhancement + EBU R128 conformance (M)
- E2 Acoustic fingerprinting pipeline (M)

### Sprint 6 — Traffic, Podcast, Engagement (paralelni pod-projekti)
**Traffic (XL):** B1 Traffic & Billing tab + B2 BXF v3.1 + B4 Affidavit + B3 Dynamic placer
**Podcast (L):** C1 RSS 2.0 + podcast:2.0 + C2 auto-distribution + C3 podping
**Engagement (M-L):** C17 Live chat + C18 Polls/voting + C14 PWA + C15 Web Push

---

## Strateške XL investicije (kasneje, ločeno)

- **B1 + B2** Traffic & Billing + BXF (XL) — odklene komercialni FM revenue
- **C13** WebRTC Guest Caller Console (XL) — phone-in gostje brez zunanjih kodekov
- **C19** Loyalty/Rewards + UGC portal (XL) — P1 listener identifikacija za sponzorje
- **D8** Yjs CRDT concurrent editing (XL) — Google-Docs-style kolaboracija
- **D3** EAS HW integration DASDEC-III/SAGE (XL) — hardver za prave FM postaje
- **B5** Dynamic Ad Insertion SCTE-35/HLS (XL) — per-listener targeting

---

## Metoda

- 23 web iskanj preko `z-ai web_search` (AzuraCast, Rivendell, RadioDJ, GSelector, MusicMaster, WideOrbit, Marketron, Natural Log, EBU R128, ITU-R BS.1770, SRT, WebRTC WHEP, ElevenLabs, Murf, C2PA, CAP 1.2, FEMA IPAWS, ETSI TS 101 499, ETSI TS 102 410, Liquidsoap, Icecast, HLS, Omnia, Orban, Stereo Tool, Yjs, NextAuth, SAML, OIDC, CycloneDX, Prometheus, Grafana, Loki, Alertmanager, PWA, VAPID, Framer Motion, WCAG 2.2, react-simple-maps, wavesurfer.js, Ayrshare, podping.live, etc.)
- 4 vzporedni subagenti (research-A/B/C/D) sintetizirali po tematskih skupinah
- Vsaka sinteza preverjena proti `worklog.md` (1502 vrstic) — ni prekrivanja z implementiranim

**Skupaj:** 81 priložnosti, 23 spletnih iskanj, 4 sinteze, 1 roadmap.
