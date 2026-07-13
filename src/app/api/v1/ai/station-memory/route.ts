import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Station Intelligence Database — dolgoročni spomin postaje.
 *
 * To NI nov AI modul. To je institucionalni spomin.
 *
 * Razlika od Knowledge Engine:
 *   Knowledge Engine: strukturirana pravila z dokazi (semantic, statistical)
 *   Station Memory: narativni, longitudinalni, institucionalni (temporal, behavioral)
 *
 * Izkušeni programski direktor po 20 letih ve:
 *   - "Leta 2019 smo poskusili daljši jutranji blok brez novic. Ni delovalo."
 *   - "Jutranji poslušalci v avtu ne prenašajo počasnih skladb."
 *   - "Ko predvajamo Foo Fighters ob 7:15, poslušanost vedno skoči."
 *   - "Poslušalci v službi (desktop) ostanejo dlje ko je manj govora."
 *
 * Ta API hrani takšno znanje sistematično — ne v glavi ene osebe.
 *
 * GET /api/v1/ai/station-memory — full institutional memory
 * POST /api/v1/ai/station-memory — record memory, add observation
 */

// ============================================================================
// 1. Behavioral Listener Segments — VZORCI, ne posamezniki
// ============================================================================
interface ListenerSegment {
  id: string
  name: string
  description: string
  // When they listen
  typicalHours: string
  typicalDays: string[]
  // Where they listen
  devices: string[]
  contexts: string[]
  // How they behave
  avgSessionMin: number
  returnRate7d: number
  churnRisk: number
  // What they respond to
  respondsWellTo: string[]
  doesNotRespondWellTo: string[]
  // Key insight
  keyInsight: string
  // Size
  estimatedSize: number
  percentageOfAudience: number
}

const SEGMENTS: ListenerSegment[] = [
  {
    id: 'seg-morning-commuter',
    name: 'Jutranji voznik (commute)',
    description: 'Poslušalci v avtu med 6:00-9:00, vožnja 20-40min',
    typicalHours: '06:00-09:00', typicalDays: [1, 2, 3, 4, 5],
    devices: ['car', 'mobile'], contexts: ['driving', 'commute'],
    avgSessionMin: 28, returnRate7d: 78, churnRisk: 0.15,
    respondsWellTo: ['visoka energija', 'hits', 'prometne informacije', 'časovne napovedi', 'hitri voice linki (<20s)'],
    doesNotRespondWellTo: ['dolge voice linki (>30s)', 'počasne skladbe zjutraj', 'dolg uvod (>15s)', 'nova glasba brez konteksta'],
    keyInsight: 'Ta segment ima fiksno časovno okno — če jih izgubiš ob 7:15, se ne vrnejo. Vsaka minuta šteje.',
    estimatedSize: 4200, percentageOfAudience: 49.6,
  },
  {
    id: 'seg-office-worker',
    name: 'Službeni poslušalec (desktop)',
    description: 'Poslušalci v službi na računalniku, 9:00-17:00',
    typicalHours: '09:00-17:00', typicalDays: [1, 2, 3, 4, 5],
    devices: ['desktop'], contexts: ['office', 'work'],
    avgSessionMin: 180, returnRate7d: 82, churnRisk: 0.08,
    respondsWellTo: ['manj prekinitev', 'globlje rezije', 'albumske verzije', 'manj govora', 'stalnost formata'],
    doesNotRespondWellTo: ['pogoste reklame', 'glasni voice linki', 'nagle spremembe energije', 'preveč govora'],
    keyInsight: 'Najdaljše seje vseh segmentov. Ne iščejo napetosti — iščejo ozadje. Manj govora = daljše seje.',
    estimatedSize: 1800, percentageOfAudience: 21.2,
  },
  {
    id: 'seg-afternoon-driver',
    name: 'Popoldanski voznik (drive home)',
    description: 'Poslušalci v avtu med 15:00-19:00, vožnja 25-45min',
    typicalHours: '15:00-19:00', typicalDays: [1, 2, 3, 4, 5],
    devices: ['car', 'mobile'], contexts: ['driving', 'commute-home', 'school-pickup'],
    avgSessionMin: 35, returnRate7d: 74, churnRisk: 0.18,
    respondsWellTo: ['visoka energija', 'hits', 'promet', 'priporočila za večer', 'fun facts'],
    doesNotRespondWellTo: ['počasne skladbe ob 16:00', 'dolg voice link pred prometno konico', 'preveč novic'],
    keyInsight: 'Najbolj občutljivi na promet — če damo promet ob 16:15 namesto 16:00, izgubimo 8% poslušalcev. Časovna natančnost je ključna.',
    estimatedSize: 2100, percentageOfAudience: 24.8,
  },
  {
    id: 'seg-evening-listener',
    name: 'Večerni poslušalec (home)',
    description: 'Poslušalci doma 19:00-23:00, sprostitev',
    typicalHours: '19:00-23:00', typicalDays: [0, 1, 2, 3, 4, 5, 6],
    devices: ['smart-speaker', 'mobile', 'desktop'], contexts: ['home', 'relaxing', 'dinner', 'cooking'],
    avgSessionMin: 65, returnRate7d: 61, churnRisk: 0.28,
    respondsWellTo: ['globlje rezije', 'albumske skladbe', 'tematski bloki', 'manj hitov', 'AI DJ z umetniškimi izbori'],
    doesNotRespondWellTo: ['preveč hitov', 'reklame (motijo sprostitev)', 'visoka energija po 21:00'],
    keyInsight: 'Najbolj selektivni poslušalci. Ne iščejo hitov — iščejo razmerje. Če damo preveč komercialne glasbe, odidejo k streamingu.',
    estimatedSize: 900, percentageOfAudience: 10.6,
  },
  {
    id: 'seg-weekend-casual',
    name: 'Vikend poslušalec (casual)',
    description: 'Občasni poslušalci, predvsem vikend',
    typicalHours: '08:00-22:00', typicalDays: [0, 6],
    devices: ['mobile', 'smart-speaker', 'tablet'], contexts: ['weekend', 'leisure', 'family'],
    avgSessionMin: 22, returnRate7d: 34, churnRisk: 0.52,
    respondsWellTo: ['hits', 'znane klasike', 'natečaji', 'interaktivne oddaje', 'družabna omrežja'],
    doesNotRespondWellTo: ['nova glasba', 'dolge voice linki', 'globlje rezije', 'počasne skladbe'],
    keyInsight: 'Najvišja fluktuacija. Ne vračajo se vsak teden — potrebni so natečaji in dogodki, da jih pritegnemo nazaj.',
    estimatedSize: 3200, percentageOfAudience: 37.8,
  },
]

// ============================================================================
// 2. Music Taste Evolution — kako se okus spreminja skozi leta
// ============================================================================
interface TasteEvolution {
  period: string
  year: number
  // What was popular
  topGenres: string[]
  topArtists: string[]
  avgBpmPreference: number
  energyPreference: string
  // How listeners responded
  altAverage: number
  topTrackRetention: number
  // Key change
  keyChange: string
  // Evidence
  evidence: string
}

const TASTE_EVOLUTION: TasteEvolution[] = [
  {
    period: '2020-2021 (COVID era)', year: 2020,
    topGenres: ['classic-rock', 'alternative', 'indie-rock'], topArtists: ['Queen', 'Fleetwood Mac', 'Arctic Monkeys'],
    avgBpmPreference: 110, energyPreference: 'medium (comfort listening during lockdown)',
    altAverage: 14.2, topTrackRetention: 0.72,
    keyChange: 'Poslušalci so iskali uteho — klasični rock in znane skladbe so imele najvišjo zadrževalno moč. Nova glasba je bila slabo sprejeta.',
    evidence: 'Analiza 2.4M track plays — klasike so imele +3.1min ALT napram novim izdajam',
  },
  {
    period: '2022-2023 (post-COVID recovery)', year: 2022,
    topGenres: ['alternative-rock', 'indie-rock', 'post-punk-revival'], topArtists: ['Foo Fighters', 'Imagine Dragons', 'The Killers'],
    avgBpmPreference: 125, energyPreference: 'high (return to energy after lockdown)',
    altAverage: 16.5, topTrackRetention: 0.78,
    keyChange: 'Vrnitev k visoki energiji. Poslušalci so hoteli aktivno glasbo, ne več utehe. Foo Fighters so doživeli renesanso.',
    evidence: 'Energične skladbe (energy >0.7) so povečale ALT za +2.3min napram 2020',
  },
  {
    period: '2024-2025 (streaming generation)', year: 2024,
    topGenres: ['modern-rock', 'alternative', 'classic-rock-revival'], topArtists: ['Greta Van Fleet', 'Måneskin', 'Arctic Monkeys'],
    avgBpmPreference: 120, energyPreference: 'varied (listeners more eclectic)',
    altAverage: 17.8, topTrackRetention: 0.81,
    keyChange: 'Poslušalci postajajo eklektični — ne iščejo več enega žanra. Zmožnost odkrivanja novih izvajalcev (Måneskin, Greta Van Fleet) je postala ključna.',
    evidence: 'Discovery rate se je dvignil z 58% na 72% — poslušalci bolj odprti za novo',
  },
  {
    period: '2026 (current)', year: 2026,
    topGenres: ['classic-rock', 'alternative', 'modern-rock'], topArtists: ['Foo Fighters', 'The White Stripes', 'AC/DC'],
    avgBpmPreference: 124, energyPreference: 'high (drive-time focus)',
    altAverage: 18.9, topTrackRetention: 0.84,
    keyChange: 'Vrnitev h klasičnemu rocku z modernim twistom. AI Station Brain optimizira za ALT — znanje iz prejšnjih let se uporablja za odločitve.',
    evidence: 'AI decisions based on 6 years of accumulated station memory',
  },
]

// ============================================================================
// 3. Programming Decision History — kaj je delovalo, kaj ne
// ============================================================================
interface ProgrammingDecision {
  id: string
  year: number
  decision: string
  type: 'format-change' | 'schedule-change' | 'music-policy' | 'voice-link' | 'ad-strategy' | 'technology' | 'experiment'
  // What happened
  hypothesis: string
  outcome: 'success' | 'partial' | 'failure' | 'abandoned'
  altBefore: number
  altAfter: number
  altDelta: number
  // Duration
  triedFor: string
  // Lesson
  lesson: string
  // Would we try again?
  retryVerdict: string
  // Evidence quality
  evidenceType: 'before-after' | 'ab-test' | 'observational'
  isReal: boolean
}

const DECISION_HISTORY: ProgrammingDecision[] = [
  {
    id: 'dec-2019-001', year: 2019,
    decision: 'Daljši jutranji blok brez novic (6:00-8:00 brez prekinitev)',
    type: 'schedule-change',
    hypothesis: 'Manj prekinitev zjutraj = daljše seje',
    outcome: 'failure', altBefore: 15.2, altAfter: 13.8, altDelta: -1.4,
    triedFor: '3 tedne',
    lesson: 'Jutranji poslušalci v avtu PRIČAKUJEjo novice ob 7:00 in 8:00. Brez novic odidejo k konkurenci. Novice so sidro, ne motnja.',
    retryVerdict: 'Ne poskušati ponovno — potrjeno dvakrat (2019, 2024)',
    evidenceType: 'before-after', isReal: false,
  },
  {
    id: 'dec-2020-001', year: 2020,
    decision: 'AI DJ voice linki namesto živega voditelja med 22:00-06:00',
    type: 'voice-link',
    hypothesis: 'AI DJ je dovolj dober za overnight in prihrani stroške',
    outcome: 'success', altBefore: 12.1, altAfter: 14.8, altDelta: +2.7,
    triedFor: '6 mesecev (nato stalno)',
    lesson: 'Overnight poslušalci so manj zahtevni glede voice linkov. AI DJ je dovolj dober. Prihranek stroškov: 40k€/leto.',
    retryVerdict: 'Že implementirano — nadaljuj',
    evidenceType: 'before-after', isReal: false,
  },
  {
    id: 'dec-2021-002', year: 2021,
    decision: 'Uvedba "New Music Wednesday" — vsako sredo 1 nova skladba na uro',
    type: 'music-policy',
    hypothesis: 'Redno predstavljanje nove glasbe poveča return rate',
    outcome: 'success', altBefore: 14.5, altAfter: 16.2, altDelta: +1.7,
    triedFor: 'Trajno',
    lesson: 'Poslušalci se vračajo na sredo, ker vedo da bodo slišali nekaj novega. Return rate +8% ob sredah.',
    retryVerdict: 'Že implementirano — ključni del programske identitete',
    evidenceType: 'before-after', isReal: false,
  },
  {
    id: 'dec-2022-001', year: 2022,
    decision: 'Krajše reklame (3min → 2min) z več bloki',
    type: 'ad-strategy',
    hypothesis: 'Krajši bloki zadržijo več poslušalcev',
    outcome: 'partial', altBefore: 16.5, altAfter: 17.1, altDelta: +0.6,
    triedFor: '2 meseca',
    lesson: 'Poslušalci so ostali dlje, vendar je prihodek padel za 12% (manj oglasov). Ravnovesje: 2.5min je optimalno.',
    retryVerdict: 'Poskušali znova 2026 z 2.5min — A/B test exp-002 potrjuje (P=0.003)',
    evidenceType: 'before-after', isReal: false,
  },
  {
    id: 'dec-2023-001', year: 2023,
    decision: 'Uvedba listener requests v jutranjem programu',
    type: 'format-change',
    hypothesis: 'Interaktivnost poveča ALT in return rate',
    outcome: 'success', altBefore: 16.8, altAfter: 18.9, altDelta: +2.1,
    triedFor: 'Trajno',
    lesson: 'Poslušalci, ki slišijo svojo zahtevo, ostanejo +8.5min dlje. Najmočnejši posamezni faktor ALT.',
    retryVerdict: 'Že implementirano — A/B test exp-001 preverja vzročnost',
    evidenceType: 'before-after', isReal: false,
  },
  {
    id: 'dec-2024-001', year: 2024,
    decision: 'Poskus daljšega jutranjega bloka brez novic (ponovitev 2019)',
    type: 'schedule-change',
    hypothesis: 'Morda se je okus spremenil — poskušamo znova',
    outcome: 'failure', altBefore: 18.1, altAfter: 16.9, altDelta: -1.2,
    triedFor: '2 tedna',
    lesson: 'Enak rezultat kot 2019. Jutranji vozniški segment še vedno pričakuje novice ob 7:00 in 8:00. To je trajno pravilo, ne trend.',
    retryVerdict: 'Ne poskušati tretjič — pravilo je potrjeno dvakrat v različnih letih',
    evidenceType: 'before-after', isReal: false,
  },
  {
    id: 'dec-2025-001', year: 2025,
    decision: 'AI Station Brain prevzame dnevne odločitve (človek samo nadzor)',
    type: 'technology',
    hypothesis: 'AI lahko vodi program bolje kot človek na podlagi podatkov',
    outcome: 'partial', altBefore: 17.2, altAfter: 18.9, altDelta: +1.7,
    triedFor: '12 mesecev',
    lesson: 'AI je boljši v vsakodnevnih odločitvah (track selection, timing). Človek je še vedno boljši v strateških odločitvah (format changes, special events). Optimalno: AI dnevno, človek strateško.',
    retryVerdict: 'Nadaljuj z hibridnim modelom — AI + človek',
    evidenceType: 'before-after', isReal: false,
  },
  {
    id: 'dec-2026-001', year: 2026,
    decision: 'Weather context v AI DJ voice linkih',
    type: 'voice-link',
    hypothesis: 'Vremenska kontekstualizacija poveča ALT',
    outcome: 'partial', altBefore: 18.5, altAfter: 18.9, altDelta: +0.4,
    triedFor: '3 mesece (A/B test exp-005 v planning)',
    lesson: 'Šibka korelacija (+0.4min). Morda bolj pomembno za perception (listeners feel cared for) kot za dejansko ALT. A/B test needed.',
    retryVerdict: 'A/B test exp-005 bo odločil',
    evidenceType: 'observational', isReal: false,
  },
]

// ============================================================================
// 4. Institutional Lessons — znanje izkušenega PD
// ============================================================================
interface InstitutionalLesson {
  id: string
  category: 'programming' | 'music' | 'listeners' | 'technology' | 'business'
  lesson: string
  evidence: string
  yearLearned: number
  stillValid: boolean
  // How it's used
  usedBy: string[] // which AI modules use this
  // Counter-evidence (if any)
  counterEvidence?: string
}

const LESSONS: InstitutionalLesson[] = [
  {
    id: 'lesson-001', category: 'listeners',
    lesson: 'Jutranji vozniški segment ima fiksno časovno okno. Če izgubiš poslušalca ob 7:15, se ne vrne.',
    evidence: 'Opazovano 2019-2026: ALT pade 40% po 7:30 če program ni optimalen',
    yearLearned: 2019, stillValid: true,
    usedBy: ['station-brain', 'scheduler', 'show-prep'],
  },
  {
    id: 'lesson-002', category: 'music',
    lesson: 'Foo Fighters ob 7:15 vedno dvignejo poslušanost. To je najbolj zanesljiv "anchor" v jutranjem programu.',
    evidence: '47 analiziranih predvajanj ob 7:00-7:30 — povprečno +12% poslušalcev v 2min',
    yearLearned: 2021, stillValid: true,
    usedBy: ['station-brain', 'scheduler'],
  },
  {
    id: 'lesson-003', category: 'programming',
    lesson: 'Novice ob 7:00 in 8:00 so sidro, ne motnja. Brez njih ALT pade.',
    evidence: 'Poskus 2019 (failure) + poskus 2024 (failure) — potrjeno dvakrat',
    yearLearned: 2019, stillValid: true,
    usedBy: ['station-brain', 'show-prep', 'scheduler'],
    counterEvidence: 'Nepoznan — noben kontekst, kjer bi odsotnost novic delovala',
  },
  {
    id: 'lesson-004', category: 'listeners',
    lesson: 'Službeni poslušalci (desktop) iščejo ozadje, ne napetost. Manj govora = daljše seje.',
    evidence: 'Desktop seje z <4 voice linki/uro: 195min. Z >6 voice linki/uro: 142min.',
    yearLearned: 2022, stillValid: true,
    usedBy: ['station-brain', 'scheduler'],
  },
  {
    id: 'lesson-005', category: 'music',
    lesson: 'Dve počasni skladbi zapored povzročata 3x več odhodov podnevi. Ponoči je to sprejemljivo.',
    evidence: 'Knowledge Engine rule-001 (simulated, A/B P=0.008, d=0.38)',
    yearLearned: 2026, stillValid: true,
    usedBy: ['station-brain', 'knowledge-engine', 'scheduler'],
  },
  {
    id: 'lesson-006', category: 'business',
    lesson: 'Reklamni bloki >3min povzročijo 12% odhod. Optimalno: 2.5min, 4 spoti.',
    evidence: 'A/B test exp-002 (P=0.003, d=0.42, shipped)',
    yearLearned: 2026, stillValid: true,
    usedBy: ['station-brain', 'optimizer', 'traffic-placer'],
  },
  {
    id: 'lesson-007', category: 'listeners',
    lesson: 'Izpolnjene zahteve poslušalcev so najmočnejši posamezni faktor ALT (+8.5min korelacija).',
    evidence: 'Correlation P<0.01, n=142. A/B test exp-001 running za vzročno potrjevanje.',
    yearLearned: 2023, stillValid: true,
    usedBy: ['station-brain', 'listener-brain', 'scheduler'],
    counterEvidence: 'Korelacija, ne vzročnost — P1 listeners naturally have longer sessions',
  },
  {
    id: 'lesson-008', category: 'programming',
    lesson: 'Poslušalci se vračajo na sredo (New Music Wednesday). Return rate +8% ob sredah.',
    evidence: 'Before-after 2021: return rate 29% → 37% ob sredah po uvedbi',
    yearLearned: 2021, stillValid: true,
    usedBy: ['station-brain', 'show-prep', 'scheduler'],
  },
  {
    id: 'lesson-009', category: 'technology',
    lesson: 'AI DJ je dovolj dober za overnight, ne za jutranji program. Jutranji poslušalci pričakujejo osebnost.',
    evidence: 'Overnight ALT +2.7min z AI DJ. Morning ALT -0.8min z AI DJ (abandoned after 2 weeks).',
    yearLearned: 2020, stillValid: true,
    usedBy: ['station-brain', 'voice-cloning'],
  },
  {
    id: 'lesson-010', category: 'listeners',
    lesson: 'Večerni poslušalci so najbolj selektivni. Ne iščejo hitov — iščejo razmerje.',
    evidence: 'Evening completion rate 62% z all-hits, 84% z mixed/deep cuts',
    yearLearned: 2023, stillValid: true,
    usedBy: ['station-brain', 'scheduler'],
  },
]

export async function GET() {
  await new Promise((r) => setTimeout(r, 80))

  const totalListeners = SEGMENTS.reduce((s, seg) => s + seg.estimatedSize, 0)
  const successfulDecisions = DECISION_HISTORY.filter(d => d.outcome === 'success').length
  const failedDecisions = DECISION_HISTORY.filter(d => d.outcome === 'failure').length
  const altGrowth2019to2026 = TASTE_EVOLUTION[TASTE_EVOLUTION.length - 1].altAverage - TASTE_EVOLUTION[0].altAverage

  return NextResponse.json({
    _disclaimer: '⚠️ INSTITUTIONAL MEMORY — all data is illustrative demonstration. isReal=false for all evidence. Real station memory requires years of actual operation. This framework defines HOW institutional knowledge will be accumulated and used. When real data flows in, this becomes the station\'s accumulated wisdom — not a database, but a memory.',

    // 1. Behavioral segments — VZORCI, ne posamezniki
    listenerSegments: SEGMENTS,

    // 2. Music taste evolution — kako se okus spreminja skozi leta
    tasteEvolution: TASTE_EVOLUTION,

    // 3. Programming decision history — kaj je delovalo, kaj ne
    decisionHistory: DECISION_HISTORY,

    // 4. Institutional lessons — znanje izkušenega PD
    institutionalLessons: LESSONS,

    // Stats
    stats: {
      segmentCount: SEGMENTS.length,
      totalListenersReach: totalListeners,
      yearsOfMemory: 7, // 2019-2026
      decisionsRecorded: DECISION_HISTORY.length,
      successfulDecisions,
      failedDecisions,
      retrySuccessRate: '0% (2 retries, both failed — same outcome as original)',
      lessonsLearned: LESSONS.length,
      stillValidLessons: LESSONS.filter(l => l.stillValid).length,
      altGrowth2019to2026: Math.round(altGrowth2019to2026 * 10) / 10,
      // Honesty
      realEvidenceCount: DECISION_HISTORY.filter(d => d.isReal).length, // 0
      honestyRate: '0% real — all institutional memory is demonstration',
    },

    // How this differs from Knowledge Engine
    howItDiffers: {
      knowledgeEngine: 'Structured rules with statistical evidence + applicability boundaries (semantic, statistical)',
      stationMemory: 'Narrative, longitudinal, institutional — the STORY of the station (temporal, behavioral, experiential)',
      example: 'Knowledge Engine: "Two consecutive low-energy tracks increase tune-out by 2.7% (P=0.008, d=0.38)" | Station Memory: "Leta 2019 smo poskusili daljši jutranji blok brez novic. Ni delovalo. Poskusili ponovno leta 2024. Enak rezultat. Pravilo ostane."',
    },

    // How AI modules use this
    integration: {
      stationBrain: 'Reads lessons + segments before every decision. "What did we learn about morning commuters?"',
      scheduler: 'Reads taste evolution for BPM/energy targets per daypart. "What energy works in 2026 vs 2020?"',
      showPrep: 'Reads decision history to avoid repeating failures. "We tried this in 2019, it failed."',
      knowledgeEngine: 'Feeds confirmed lessons into rule lifecycle. Lesson → Hypothesis → A/B → Rule',
      optimizer: 'Reads segment preferences for multi-objective weights. "Office workers weight differently than commuters."',
    },

    // The vision
    vision: {
      year1: 'Station Memory accumulates real decisions + outcomes. isReal transitions to true for new entries.',
      year3: 'Patterns emerge — seasonal trends, multi-year cycles, generational taste shifts.',
      year5: 'Station Memory becomes the station\'s most valuable asset — institutional knowledge that no employee turnover can erase.',
      year10: 'AI has 10 years of accumulated wisdom. It knows what works in recessions, pandemics, heatwaves, holidays. It has seen it all.',
      principle: 'An experienced program director carries 20 years of memory in their head. When they leave, that memory leaves with them. Station Memory ensures it stays.',
    },
  })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))

  if (body.action === 'record-decision' && body.decision) {
    const entry: ProgrammingDecision = {
      id: `dec-${new Date().getFullYear()}-${Date.now()}`,
      year: new Date().getFullYear(),
      decision: body.decision,
      type: body.type ?? 'experiment',
      hypothesis: body.hypothesis ?? '',
      outcome: body.outcome ?? 'pending',
      altBefore: body.altBefore ?? 0, altAfter: body.altAfter ?? 0, altDelta: 0,
      triedFor: body.triedFor ?? 'ongoing',
      lesson: body.lesson ?? 'To be determined',
      retryVerdict: body.retryVerdict ?? 'TBD',
      evidenceType: body.evidenceType ?? 'observational',
      isReal: false, // always false until real data
    }
    entry.altDelta = entry.altAfter - entry.altBefore
    DECISION_HISTORY.unshift(entry)
    return NextResponse.json({ ok: true, entry, message: 'Decision recorded in station memory' })
  }

  if (body.action === 'add-lesson' && body.lesson) {
    const lesson: InstitutionalLesson = {
      id: `lesson-${Date.now()}`,
      category: body.category ?? 'programming',
      lesson: body.lesson,
      evidence: body.evidence ?? 'No evidence provided',
      yearLearned: new Date().getFullYear(),
      stillValid: true,
      usedBy: body.usedBy ?? [],
    }
    LESSONS.unshift(lesson)
    return NextResponse.json({ ok: true, lesson, message: 'Institutional lesson recorded' })
  }

  if (body.action === 'check-retry' && body.decisionDescription) {
    // Check if this decision was tried before
    const similar = DECISION_HISTORY.filter(d =>
      d.decision.toLowerCase().includes(body.decisionDescription.toLowerCase().slice(0, 20)) ||
      body.decisionDescription.toLowerCase().includes(d.decision.toLowerCase().slice(0, 20))
    )
    if (similar.length > 0) {
      return NextResponse.json({
        ok: true,
        warning: 'SIMILAR DECISION FOUND IN STATION MEMORY',
        previousAttempts: similar.map(d => ({
          year: d.year, decision: d.decision, outcome: d.outcome, altDelta: d.altDelta, lesson: d.lesson, retryVerdict: d.retryVerdict,
        })),
        recommendation: similar[0].retryVerdict,
      })
    }
    return NextResponse.json({ ok: true, message: 'No similar decisions found in station memory' })
  }

  return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 })
}
