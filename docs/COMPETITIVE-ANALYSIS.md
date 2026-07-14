# Competitive Analysis — Rock 88.7 vs the Radio Industry

> *Where does this project stand compared to what exists? What is better, what is worse, and what is unique?*

*Research date: 2026-07-14. Based on web research of current radio automation and AI platforms.*

---

## The landscape

There are three tiers of radio automation:

### Tier 1: Open-source self-hosted (free)

| Platform | AI? | Voice tracking? | Governance? | Our position |
|----------|-----|-----------------|-------------|--------------|
| **AzuraCast** | ❌ No | ❌ No | ❌ No | We have AI + governance — **they don't** |
| **LibreTime** | ❌ No | ❌ No | ❌ No | We have AI + governance — **they don't** |
| **Rivendell** | ❌ No | ⚠️ Manual | ❌ No | We are the AI layer over Rivendell |

**Verdict:** In the open-source tier, Rock 88.7 is **the only one with AI, epistemic governance, and a Decision Ledger**. AzuraCast and LibreTime are excellent playout systems, but they have no AI, no trust model, no learning loop.

### Tier 2: Commercial AI radio tools (paid)

| Platform | AI DJ? | Natural voice? | Price | Our position |
|----------|--------|----------------|-------|--------------|
| **Super Hi-Fi** (MagicStitch) | ✅ Yes | ✅ Premium | Enterprise $$$$ | They have better audio mixing; we have governance |
| **RoboDJ** | ✅ Yes | ⚠️ TTS-based | ~$50/mo | Similar TTS approach; we are free + open |
| **Radio.co Voice Studio** | ✅ Yes | ✅ Good | ~$50/mo | They are polished SaaS; we are self-hosted + open |
| **RCS ZettaCloud + SelectorCloud** | ✅ AI scheduling | ⚠️ Voice tracking separate | Enterprise $$$$ | They have 40+ years of radio pedigree; we have epistemic layer |

**Verdict:** Commercial tools have **better audio quality and polish**. Rock 88.7 has **governance, honesty, and zero cost**. They optimize for sound; we optimize for trust.

### Tier 3: Research / experimental

| Approach | What it does | Our position |
|----------|-------------|--------------|
| AI DJ voice cloning (WellSaid, ElevenLabs) | Indistinguishable from human | We use free gTTS — lower quality, but free |
| AI music scheduling (SelectorCloud AI) | Analyzes listener data for rotation | We have this (scheduler engine) + evidence lifecycle |
| Trust calibration (academic research) | Confidence calibration, epistemic integrity | **We implemented what they only write papers about** |

---

## Where Rock 88.7 is BETTER

### 1. Epistemic governance — **unique in the industry**

No other radio platform — open-source or commercial — has:

- **7 epistemological invariants** governing what the AI can claim
- **Autonomy Ladder** (Level 0–4) requiring hard evidence for promotion
- **Decision Ledger** tracking every AI decision end-to-end
- **Confidence Calibration** (10-bucket, measured vs claimed)
- **Temporal Stability** tiers (ephemeral → entrenched)
- **Station Chronicle** as institutional memory
- **Mechanical lesson derivation** (AI never writes its own history)

This is the **only radio system in the world** that can answer "why should we trust the AI?" with evidence rather than marketing.

Academic papers discuss "epistemic integrity as a governance requirement" and "trust calibration" — we implemented it.

### 2. Honesty about capabilities

| Platform | Claims | Reality |
|----------|--------|---------|
| Super Hi-Fi | "AI-powered" | Polished audio, but no trust model |
| RoboDJ | "AI voice tracking" | TTS, similar to ours |
| SelectorCloud | "AI scheduling" | Proprietary, no transparency |
| **Rock 88.7** | **"Trust Score 0/100, Level 0"** | **Honest — nothing earned yet** |

Every other platform *claims* AI works. Rock 88.7 *proves* whether it works, with data.

### 3. Open-source + self-hosted + free

- AzuraCast: free, but no AI
- LibreTime: free, but no AI
- Super Hi-Fi: AI, but enterprise pricing
- Radio.co: AI, but $50+/month
- **Rock 88.7: AI + governance + free + open-source**

### 4. Track/Asset separation

Professional systems (RCS Zetta) have this. Open-source systems (AzuraCast, LibreTime) do not. Rock 88.7 has it — one Track, many Assets (MP3, FLAC, radio edit, clean edit).

### 5. Multi-provider TTS (free)

- gTTS (Google neural) — 69 languages, 9 Slavic
- z-ai TTS (tongtong) — fallback
- pyttsx3 — offline last resort

No other open-source radio platform offers multi-provider TTS out of the box.

---

## Where Rock 88.7 is WORSE

### 1. Audio quality — significantly behind commercial

| Feature | Rock 88.7 | Super Hi-Fi | Gap |
|---------|-----------|-------------|-----|
| Voice quality | gTTS (good, not great) | WellSaid/ElevenLabs (indistinguishable from human) | Large |
| Audio mixing | Liquidsoap crossfade | MagicStitch (2B decisions/month) | Large |
| Voice cloning | ❌ Not implemented | ✅ Industry standard | Large |
| Loudness normalization | EBU R128 (basic) | VoiceIQ 2.0 (professional) | Medium |

**Honest assessment:** For a pilot, gTTS is sufficient. For a commercial station competing with Super Hi-Fi clients, we need ElevenLabs integration ($5/mo) or voice cloning.

### 2. Maturity and battle-testing

| Platform | Years in production | Stations using it |
|----------|--------------------|-------------------|
| RCS Zetta | 40+ | Thousands (BBC, iHeart, etc.) |
| AzuraCast | 8+ | Thousands |
| LibreTime | 10+ | Hundreds |
| Super Hi-Fi | 7+ | Major networks |
| **Rock 88.7** | **0** | **0** |

**Honest assessment:** We have zero production hours. Every other platform has years. This is the biggest gap, and it can only close with real operation.

### 3. UI polish

| Platform | UI quality |
|----------|-----------|
| AzuraCast | Excellent, modern |
| Radio.co | Excellent, SaaS-grade |
| RCS Zetta | Professional, dense |
| **Rock 88.7** | Good, but 25+ panels can be overwhelming |

**Honest assessment:** The dashboard is functional and professional, but AzuraCast's UI is more polished for daily station management.

### 4. Ecosystem and integrations

| Platform | Integrations |
|----------|-------------|
| AzuraCast | 50+ (Icecast, Shoutcast, TuneIn, etc.) |
| RCS Zetta | 100+ (every broadcast standard) |
| **Rock 88.7** | 20+ (Icecast2, Liquidsoap, RDS, DAB+, AES67, etc.) |

**Honest assessment:** We cover the important standards, but commercial systems have deeper hardware integration.

### 5. Community and support

| Platform | Community |
|----------|----------|
| AzuraCast | Active Discord, 5k+ stars |
| LibreTime | Active forum, 1k+ stars |
| **Rock 88.7** | Solo developer, 1 repo |

**Honest assessment:** No community yet. This is a solo project until it gains adoption.

---

## What is UNIQUE (no competitor has this)

### The epistemological layer

This is the single most differentiating feature. No radio platform — anywhere — has:

1. **A constitution (7 invariants)** governing AI claims
2. **An autonomy ladder** requiring evidence for promotion
3. **A decision ledger** with mechanical lesson derivation
4. **Confidence calibration** measured against real outcomes
5. **Temporal stability** tracking how long findings hold
6. **A Station Chronicle** as honest institutional memory

Academic research discusses these concepts. Super Hi-Fi, RCS, AzuraCast, LibreTime — none implement them.

**This is the one thing Rock 88.7 does that nobody else does.**

### The honest starting state

Every other platform launches claiming "AI-powered." Rock 88.7 launches saying:

```
Trust Score: 0/100
Autonomy Level: 0
Real sessions: 0
Real decisions: 0
```

And it treats this as a feature, not a bug.

---

## Competitive positioning

```
                    Audio Quality
                         ↑
                         |
        Super Hi-Fi ●    |
                         |
        RCS Zetta ●      |
                         |
        Radio.co ●       |     ● Rock 88.7
                         |     (governance-first)
        RoboDJ ●         |
                         |
        AzuraCast ●      |
        LibreTime ●      |
                         |
                         +─────────────────────→ Governance/Honesty
                              ← weaker    stronger →
```

Rock 88.7 is in the **bottom-right quadrant**: lower audio quality than commercial, but uniquely strong on governance and honesty. No competitor occupies this space.

---

## The honest verdict

### What Rock 88.7 is

A **research-grade AI radio operating system** with a governance layer that no commercial product has. It is:
- Architecturally complete (31 sprints)
- Production-hardened (security audit, CI/CD, DR)
- Honest about its limitations (0 real data, Trust Score 0/100)
- Free and open-source

### What Rock 88.7 is NOT

- A polished commercial product (Super Hi-Fi, Radio.co are more polished)
- Battle-tested (0 production hours)
- A voice cloning platform (ElevenLabs integration not done)
- A community project (solo developer)

### Where it wins

Against open-source (AzuraCast, LibreTime): **AI + governance + Track/Asset model**
Against commercial (Super Hi-Fi, RCS): **Free + open + epistemic honesty + Decision Ledger**

### Where it loses

Against commercial: **Audio quality, maturity, integrations, community**
Against open-source: **Maturity, community, polish**

### The unique value proposition

> *The only radio platform that asks "why should we trust the AI?" and answers with evidence.*

Every other platform claims AI works. Rock 88.7 proves whether it does — and is honest when it doesn't.

---

## What this means for the pilot

For a **small station pilot** (100–5000 listeners), Rock 88.7 is competitive:
- Free (vs $50+/month for commercial)
- AI DJ (gTTS is sufficient for pilot)
- Governance (unique — builds trust over time)
- Self-hosted (data stays at the station)

For a **large commercial station**, Rock 88.7 is not yet competitive:
- Audio quality gap (need ElevenLabs)
- No voice cloning
- No community support
- 0 production hours

The pilot is the bridge. If Rock 88.7 operates for 6–12 months at a real station, it accumulates the evidence that closes the maturity gap. The epistemic layer — which no competitor has — becomes more valuable with every decision recorded.

---

*This analysis is honest. Where we are behind, we say so. Where we are ahead, we prove it. This is the epistemic integrity the system was built to enforce.*
