# Weakness Analysis — Where We Fall Short of the Best

> *Honest assessment of where Rock 88.7 is weaker than the industry leaders.*
> *No spin. No excuses. Just the gaps.*

*Research date: 2026-07-14. Based on 8 web searches across commercial and open-source radio platforms.*

---

## The competitors

| Tier | Platform | What they do | Price |
|------|----------|-------------|-------|
| **Enterprise** | Super Hi-Fi (MagicStitch + VoiceIQ) | AI audio mixing, voice mastering, 2B decisions/month | $$$$ (enterprise) |
| **Enterprise** | RCS ZettaCloud + SelectorCloud | 40+ years pedigree, AI scheduling, cloud playout | $$$$ (enterprise) |
| **Mid-market** | Radio.co (Voice Studio) | SaaS radio, AI voice generation, 1500 credits/mo | $139/mo |
| **Budget** | RoboDJ | AI voice tracking, weather, connects to playout | ~$50/mo |
| **Open-source** | AzuraCast | Self-hosted web radio, no AI | Free |
| **Open-source** | LibreTime | Self-hosted radio automation, no AI | Free |
| **Pilot** | **Rock 88.7** | AI + governance + free TTS + auto-pilot | Free |

---

## Where we are WEAK (honest gaps)

### 1. Audio production quality — LARGE GAP

**Super Hi-Fi MagicStitch:**
- AI-powered audio stitching (2 BILLION production decisions/month)
- Automatic mixing of songs, voice tracks, branding, ads
- VoiceIQ 2.0: noise removal, tone-matching, plosive elimination, dynamic range optimization
- Professional broadcast quality — indistinguishable from human-produced

**Rock 88.7:**
- Liquidsoap crossfade (basic)
- EBU R128 normalization (basic target -23 LUFS)
- No AI audio mixing
- No voice mastering
- No noise removal on TTS output
- No tone-matching between voice and music

**Gap: LARGE.** Super Hi-Fi is a professional audio production engine. We are a basic Liquidsoap pipeline. Our TTS audio is raw — no post-processing.

**What would close this gap:**
- ffmpeg post-processing on TTS audio (noise gate, compressor, EQ)
- AI audio mixing (would need to integrate a dedicated audio processing library)
- VoiceIQ-style mastering (would need professional audio engineering)

---

### 2. Voice quality — MEDIUM-LARGE GAP

**ElevenLabs (used by Super Hi-Fi, Radio.co):**
- 1000+ voices
- Voice cloning from 30 seconds of audio
- Emotional control, prosody adjustment
- Indistinguishable from human speech
- Slovenian language supported

**Rock 88.7 (Piper TTS):**
- 1 voice per language (lessac for English, serbski_institut for Serbian)
- No voice cloning
- No emotional control
- Natural but not human-identical
- No Slovenian voice (uses Serbian as closest)

**Gap: MEDIUM-LARGE.** Piper is the best FREE TTS, but ElevenLabs is significantly better. For a pilot, Piper is sufficient. For commercial radio, ElevenLabs is needed.

**What would close this gap:**
- ElevenLabs integration ($5/mo for 30k chars — affordable)
- Or: Kokoro TTS (82M params, better than Piper, but heavier install)
- Or: train a custom Piper voice model from a Slovenian speaker

---

### 3. Music scheduling intelligence — MEDIUM GAP

**RCS SelectorCloud (2025):**
- AI engine continuously analyzes patterns, listener data, station objectives
- Learns from audience response
- Optimizes every aspect of scheduling in real-time
- 40+ years of radio programming expertise baked in

**Rock 88.7:**
- Rule-based scheduler (GSelector-class)
- Separation rules, demand scoring, conflict avoidance
- DMCA compliance
- But: NO real-time learning from audience response
- But: NO AI-driven scheduling (rules are static)

**Gap: MEDIUM.** Our scheduler is competent (rule-based, professional-grade) but not AI-driven. SelectorCloud adapts in real-time based on listener data. Our scheduler does not learn.

**What would close this gap:**
- Connect scheduler to Decision Ledger outcomes
- When a track causes tune-out, reduce its demand score
- When a track causes retention, increase its category
- This is planned in the Learning Loop module but not yet connected to the scheduler

---

### 4. Live broadcast capabilities — LARGE GAP

**RCS Zetta / professional systems:**
- Live assist mode (operator controls playout in real-time)
- Multi-studio support (Studio A, Studio B, newsroom)
- GPIO/fader start (hardware integration)
- Satellite receiver integration
- Live voice tracking (record → air in seconds)
- Emergency override

**Rock 88.7:**
- Fully automated only (auto-pilot mode)
- No live assist mode
- No multi-studio
- No GPIO/fader integration for live broadcast
- No satellite receiver
- No live voice tracking

**Gap: LARGE.** Rock 88.7 is an automated playout system. It cannot handle a live DJ, a newsroom, or hardware integration. For a fully automated web radio, this is fine. For a professional station with live shows, this is a dealbreaker.

**What would close this gap:**
- Liquidsoap live input source (harbor.input) — already in the config
- Web-based "Go Live" button that switches from auto-pilot to live mic
- Studio selection UI
- This is a significant feature, not a quick fix

---

### 5. Voice track production workflow — MEDIUM GAP

**Radio.co Voice Studio:**
- Record voice or generate with AI
- Edit within the platform
- Mix voice with music beds
- Manage voice track library
- 1500 AI credits/month included ($139/mo)

**RoboDJ:**
- Connects directly to playout software
- Back-announces and front-announces songs
- Weather reports
- Personality-driven content
- Affordable (~$50/mo)

**Rock 88.7:**
- AI generates voice link scripts ✓
- TTS synthesizes audio ✓
- But: no voice track EDITING interface
- But: no music bed mixing (voice over music)
- But: no voice track library management
- But: no back-announce + front-announce in one segment

**Gap: MEDIUM.** We generate voice links, but they are "naked" — no music bed underneath. Commercial systems mix the voice track over a music bed for a professional sound.

**What would close this gap:**
- ffmpeg: overlay voice track on a music bed (sox/ffmpeg mix)
- Web UI for voice track editing
- Voice track library (store, reuse, schedule)

---

### 6. UI/UX polish — MEDIUM GAP

**AzuraCast:**
- Clean, modern, intuitive interface
- Focused on daily station management
- Well-organized settings
- Active development community

**Radio.co:**
- SaaS-grade polish
- Mobile-responsive
- Onboarding flow
- Customer support

**Rock 88.7:**
- 25+ UI panels (can be overwhelming)
- Dense information display
- Multiple sprint panels (Sprint6, Sprint7, etc.) — should be consolidated
- No mobile-optimized operator interface
- No onboarding flow

**Gap: MEDIUM.** The dashboard is functional and professional, but it tries to do everything. AzuraCast is more focused. Radio.co is more polished.

**What would close this gap:**
- Consolidate sprint panels into a unified interface
- Create a "Daily Operator View" — simplified dashboard for daily use
- Mobile-responsive operator controls
- Remove or archive development-phase panels

---

### 7. Community and ecosystem — LARGE GAP

**AzuraCast:**
- Active Discord community (thousands of users)
- 5k+ GitHub stars
- Regular releases
- Plugin ecosystem
- Documentation wiki

**RCS:**
- 40+ years in business
- Thousands of stations
- Training programs
- 24/7 support
- Industry certifications

**Rock 88.7:**
- Solo developer
- 1 GitHub repo
- No community
- No plugins
- No support

**Gap: LARGE.** This is the hardest gap to close. Community takes years to build. Support requires people. This can only be addressed by open-sourcing widely, marketing, and time.

---

### 8. Real-time listener analytics — MEDIUM GAP

**Super Hi-Fi / RCS:**
- Real-time listener dashboards
- Per-track retention analysis
- Tune-out detection (exact second listeners leave)
- Geographic heatmap
- Device breakdown in real-time

**Rock 88.7:**
- Listener pipeline (captures sessions) ✓
- But: no real-time dashboard for current listeners
- But: no per-track retention analysis (which second caused tune-out)
- But: no geographic visualization
- But: analytics are post-hoc, not real-time

**Gap: MEDIUM.** We capture the data but don't display it in real-time. The Governance Dashboard shows aggregate metrics, not live listener activity.

**What would close this gap:**
- WebSocket-based live listener count
- Per-track exit analysis (correlate session end with track playing)
- Geographic dashboard (from IP-derived geoRegion)
- This data is already in the ListenerSession table — just needs visualization

---

### 9. Music bed / sweeper production — MEDIUM GAP

**Super Hi-Fi MagicStitch:**
- Automatically creates sweepers (voice over music transition)
- AI-driven segue points (finds the best moment to transition)
- Beat-matched mixing
- Brand-consistent audio identity

**Rock 88.7:**
- Crossfade only (basic)
- No AI-driven segue points
- No beat matching
- No sweeper generation

**Gap: MEDIUM.** Our transitions are basic crossfades. Super Hi-Fi creates professional, beat-matched, voice-over-music transitions. This is a significant quality difference audible to listeners.

---

### 10. Regulatory compliance depth — SMALL GAP

**RCS Zetta:**
- FCC Part 73 compliance (full)
- EAS/CAP integration (hardware + software)
- RSAS (Radio Software Authorization System)
- Multiple country regulatory support

**Rock 88.7:**
- EAS/CAP 1.2 ingestion + signature verification ✓
- DMCA §114 streaming caps ✓
- FCC indecency rules (safe harbor) ✓
- But: no hardware EAS integration
- But: no RSAS
- But: no multi-country regulatory pack

**Gap: SMALL.** We cover the important compliance areas for a web radio pilot. Full FCC hardware integration is needed only for FM broadcast.

---

## Summary: Where we are weak

| Gap | Severity | Competitor advantage | Can we close it? |
|-----|----------|---------------------|-----------------|
| Audio production quality | LARGE | Super Hi-Fi MagicStitch | Partially (ffmpeg post-processing) |
| Voice quality | MEDIUM-LARGE | ElevenLabs | Yes ($5/mo) |
| Music scheduling AI | MEDIUM | RCS SelectorCloud | Yes (connect Learning Loop) |
| Live broadcast | LARGE | RCS Zetta | Yes (Liquidsoap live input) |
| Voice track workflow | MEDIUM | Radio.co Voice Studio | Yes (ffmpeg bed mixing) |
| UI/UX polish | MEDIUM | AzuraCast | Yes (consolidate panels) |
| Community | LARGE | AzuraCast, RCS | Only with time + marketing |
| Real-time analytics | MEDIUM | Super Hi-Fi | Yes (WebSocket dashboard) |
| Music bed production | MEDIUM | Super Hi-Fi | Yes (ffmpeg + AI) |
| Regulatory depth | SMALL | RCS Zetta | Partially (hardware EAS) |

---

## What this means

### For a pilot (100–5000 listeners)

**Acceptable gaps:**
- Voice quality (Piper is good enough)
- UI polish (functional is fine for pilot)
- Community (not needed for pilot)
- Regulatory depth (web radio has fewer requirements)

**Must close before pilot:**
- None — the system is pilot-ready as-is

### For a commercial station

**Must close:**
- Voice quality (ElevenLabs, $5/mo)
- Audio production (post-processing)
- Live broadcast (live assist mode)
- Real-time analytics (operator dashboard)

**Nice to have:**
- Music scheduling AI (Learning Loop connection)
- UI consolidation
- Community building

### For competing with Super Hi-Fi / RCS

**Must close ALL gaps:**
- This requires significant investment, a team, and years of operation
- Rock 88.7's unique advantage (epistemic governance) is not enough to overcome the audio quality and maturity gap alone
- But: the governance layer IS the differentiator that no competitor has

---

## The honest verdict

Rock 88.7 is **pilot-ready but not commercial-ready**. The gaps are real:

1. **Audio quality** is the most audible gap — listeners will notice
2. **Voice quality** is the second most audible gap — Piper is good, ElevenLabs is better
3. **Live broadcast** is a functional gap — no live DJ capability
4. **Community** is a strategic gap — no support ecosystem

But Rock 88.7 has one thing no competitor has: **epistemic governance**. The question is whether that advantage is enough to overcome the gaps. For a pilot — yes. For commercial competition — not yet.

The path forward:
1. **Pilot first** (3-6 months) — prove the governance layer works with real data
2. **Close voice quality** (ElevenLabs, $5/mo) — most bang for buck
3. **Close audio production** (ffmpeg post-processing) — free, moderate effort
4. **Close real-time analytics** (WebSocket dashboard) — free, moderate effort
5. **Close live broadcast** (Liquidsoap live input) — free, significant effort

Each gap closed brings Rock 88.7 closer to commercial viability. The governance layer — which no competitor has — becomes more valuable with every gap closed.

---

*This analysis is honest. The gaps are real. The path forward is clear.*
