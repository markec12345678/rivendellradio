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
  // Expected vs Actual — where did predictions go wrong?
  expectedAlt: number       // what the AI/PD predicted would happen
  actualAlt: number         // what actually happened
  predictionError: number   // actualAlt - expectedAlt (negative = overestimated)
  whyWrong?: string         // if prediction was off, why?
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
    expectedAlt: 16.2, actualAlt: 13.8, predictionError: -2.4,
    whyWrong: 'PD expected less interruption = longer sessions. Reality: listeners left because they EXPECT news at 7:00/8:00. Missing news feels wrong, not relaxing.',
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
    expectedAlt: 13.6, actualAlt: 14.8, predictionError: +1.2,
    whyWrong: 'AI DJ exceeded expectations. Overnight listeners are less demanding than predicted — voice quality matters less at night.',
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
    expectedAlt: 15.5, actualAlt: 16.2, predictionError: +0.7,
    whyWrong: 'Return rate impact was larger than predicted. Listeners actively schedule their week around new music day.',
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
    expectedAlt: 18.0, actualAlt: 17.1, predictionError: -0.9,
    whyWrong: 'ALT improved less than predicted because shorter breaks also meant more frequent interruptions. Revenue dropped 12% which was not anticipated.',
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
    expectedAlt: 18.3, actualAlt: 18.9, predictionError: +0.6,
    whyWrong: 'Personalization impact was underestimated. Hearing your name on air creates stronger emotional bond than predicted.',
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
    expectedAlt: 17.5, actualAlt: 16.9, predictionError: -0.6,
    whyWrong: 'Predicted that taste might have changed in 5 years. It did not — morning news expectation is structural, not generational.',
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
    expectedAlt: 19.7, actualAlt: 18.9, predictionError: -0.8,
    whyWrong: 'AI overestimated its ability to handle strategic decisions. Good at track selection, bad at format changes. Hybrid model needed.',
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
    expectedAlt: 19.5, actualAlt: 18.9, predictionError: -0.6,
    whyWrong: 'Weather mentions have perception value (listeners feel cared for) but less ALT impact than predicted. A/B test needed.',
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
  // Confidence tracking — how strong is this memory?
  confidence: {
    level: 'very-high' | 'high' | 'medium' | 'low' | 'experimental'
    timesObserved: number      // how many times this pattern was seen
    yearsObserved: number      // over how many years
    lastConfirmed: string | null  // when was this last validated
    isReal: boolean            // false = demonstration, true = real observation
  }
  // How it's used
  usedBy: string[]
  counterEvidence?: string
}

const LESSONS: InstitutionalLesson[] = [
  {
    id: 'lesson-001', category: 'listeners',
    lesson: 'Jutranji vozniški segment ima fiksno časovno okno. Če izgubiš poslušalca ob 7:15, se ne vrne.',
    evidence: 'Opazovano 2019-2026: ALT pade 40% po 7:30 če program ni optimalen',
    yearLearned: 2019, stillValid: true,
    confidence: { level: 'very-high', timesObserved: 847, yearsObserved: 7, lastConfirmed: '2026-07-10', isReal: false },
    usedBy: ['station-brain', 'scheduler', 'show-prep'],
  },
  {
    id: 'lesson-002', category: 'music',
    lesson: 'Foo Fighters ob 7:15 vedno dvignejo poslušanost. To je najbolj zanesljiv "anchor" v jutranjem programu.',
    evidence: '47 analiziranih predvajanj ob 7:00-7:30 — povprečno +12% poslušalcev v 2min',
    yearLearned: 2021, stillValid: true,
    confidence: { level: 'high', timesObserved: 47, yearsObserved: 5, lastConfirmed: '2026-07-08', isReal: false },
    usedBy: ['station-brain', 'scheduler'],
  },
  {
    id: 'lesson-003', category: 'programming',
    lesson: 'Novice ob 7:00 in 8:00 so sidro, ne motnja. Brez njih ALT pade.',
    evidence: 'Poskus 2019 (failure) + poskus 2024 (failure) — potrjeno dvakrat',
    yearLearned: 2019, stillValid: true,
    confidence: { level: 'very-high', timesObserved: 2, yearsObserved: 5, lastConfirmed: '2024-06-15', isReal: false },
    usedBy: ['station-brain', 'show-prep', 'scheduler'],
    counterEvidence: 'Nepoznan — noben kontekst, kjer bi odsotnost novic delovala',
  },
  {
    id: 'lesson-004', category: 'listeners',
    lesson: 'Službeni poslušalci (desktop) iščejo ozadje, ne napetost. Manj govora = daljše seje.',
    evidence: 'Desktop seje z <4 voice linki/uro: 195min. Z >6 voice linki/uro: 142min.',
    yearLearned: 2022, stillValid: true,
    confidence: { level: 'high', timesObserved: 312, yearsObserved: 4, lastConfirmed: '2026-07-09', isReal: false },
    usedBy: ['station-brain', 'scheduler'],
  },
  {
    id: 'lesson-005', category: 'music',
    lesson: 'Dve počasni skladbi zapored povzročata 3x več odhodov podnevi. Ponoči je to sprejemljivo.',
    evidence: 'Knowledge Engine rule-001 (simulated, A/B P=0.008, d=0.38)',
    yearLearned: 2026, stillValid: true,
    confidence: { level: 'medium', timesObserved: 1, yearsObserved: 0, lastConfirmed: '2026-07-12', isReal: false },
    usedBy: ['station-brain', 'knowledge-engine', 'scheduler'],
  },
  {
    id: 'lesson-006', category: 'business',
    lesson: 'Reklamni bloki >3min povzročijo 12% odhod. Optimalno: 2.5min, 4 spoti.',
    evidence: 'A/B test exp-002 (P=0.003, d=0.42, shipped)',
    yearLearned: 2026, stillValid: true,
    confidence: { level: 'high', timesObserved: 1, yearsObserved: 0, lastConfirmed: '2026-07-05', isReal: false },
    usedBy: ['station-brain', 'optimizer', 'traffic-placer'],
  },
  {
    id: 'lesson-007', category: 'listeners',
    lesson: 'Izpolnjene zahteve poslušalcev so najmočnejši posamezni faktor ALT (+8.5min korelacija).',
    evidence: 'Correlation P<0.01, n=142. A/B test exp-001 running za vzročno potrjevanje.',
    yearLearned: 2023, stillValid: true,
    confidence: { level: 'medium', timesObserved: 142, yearsObserved: 3, lastConfirmed: '2026-07-10', isReal: false },
    usedBy: ['station-brain', 'listener-brain', 'scheduler'],
    counterEvidence: 'Korelacija, ne vzročnost — P1 listeners naturally have longer sessions',
  },
  {
    id: 'lesson-008', category: 'programming',
    lesson: 'Poslušalci se vračajo na sredo (New Music Wednesday). Return rate +8% ob sredah.',
    evidence: 'Before-after 2021: return rate 29% → 37% ob sredah po uvedbi',
    yearLearned: 2021, stillValid: true,
    confidence: { level: 'high', timesObserved: 260, yearsObserved: 5, lastConfirmed: '2026-07-10', isReal: false },
    usedBy: ['station-brain', 'show-prep', 'scheduler'],
  },
  {
    id: 'lesson-009', category: 'technology',
    lesson: 'AI DJ je dovolj dober za overnight, ne za jutranji program. Jutranji poslušalci pričakujejo osebnost.',
    evidence: 'Overnight ALT +2.7min z AI DJ. Morning ALT -0.8min z AI DJ (abandoned after 2 weeks).',
    yearLearned: 2020, stillValid: true,
    confidence: { level: 'high', timesObserved: 2, yearsObserved: 6, lastConfirmed: '2026-01-15', isReal: false },
    usedBy: ['station-brain', 'voice-cloning'],
  },
  {
    id: 'lesson-010', category: 'listeners',
    lesson: 'Večerni poslušalci so najbolj selektivni. Ne iščejo hitov — iščejo razmerje.',
    evidence: 'Evening completion rate 62% z all-hits, 84% z mixed/deep cuts',
    yearLearned: 2023, stillValid: true,
    confidence: { level: 'medium', timesObserved: 89, yearsObserved: 3, lastConfirmed: '2026-06-28', isReal: false },
    usedBy: ['station-brain', 'scheduler'],
  },
]

// ============================================================================
// 5. Station Journal — dnevni dnevnik postaje (chronicle, not database)
// ============================================================================
interface JournalEntry {
  date: string
  // Daily summary
  alt: number
  listeners: number
  // What happened today
  biggestSuccess: string
  biggestMistake: string
  biggestSurprise: string
  // What to do differently
  whatWouldWeDoDifferently: string
  // New hypothesis generated today
  newHypothesis: string
  // AI self-reflection
  aiSelfReflection: string
  // Mood / context
  weather: string
  daypart: string
  isReal: boolean
}

const JOURNAL: JournalEntry[] = [
  {
    date: '2026-07-12',
    alt: 19.2, listeners: 1547,
    biggestSuccess: 'Listener request fulfilled at 7:08 — listener stayed 47min longer than average. Confirms lesson-007 (+8.5min correlation).',
    biggestMistake: 'Played two mid-energy tracks (0.55, 0.50) back-to-back at 14:30. 8 listeners left. Should have enforced rule-001 more strictly.',
    biggestSurprise: 'Weather mention in voice link at 7:15 correlated with +1.2min ALT — higher than the +0.4min average. Maybe sunny weather amplifies the effect?',
    whatWouldWeDoDifferently: 'Enforce energy floor >0.6 for all tracks between 14:00-15:00. The post-lunch dip is real and we need to counter-program.',
    newHypothesis: 'If weather mentions have higher impact on sunny days (+1.2min) vs rainy days (+0.3min), weather context value is weather-dependent.',
    aiSelfReflection: 'I predicted 94% retention for the 14:30 slot but got 89%. My energy curve model underestimates post-lunch sensitivity. Adjusting weight.',
    weather: 'sunny, 24°C', daypart: 'mixed (morning + afternoon)', isReal: false,
  },
  {
    date: '2026-07-11',
    alt: 18.7, listeners: 1389,
    biggestSuccess: 'New Music Wednesday worked again — return rate +7.8%. Greta Van Fleet "Highway Tune" accepted by 81% of listeners (discovery rate above target).',
    biggestMistake: 'Ad break at 16:45 was 3.2min (should be ≤2.5min per rule-002). Operator override — needs automatic enforcement.',
    biggestSurprise: 'A listener requested Hotel California at 15:30. Usually a safe choice, but 3 listeners left during the 6min track. Maybe too long for afternoon drive?',
    whatWouldWeDoDifferently: 'Auto-enforce 2.5min ad break cap without operator override option. Consider editing Hotel California for drive time (radio edit 4:02 vs album 6:31).',
    newHypothesis: 'If track duration >5min during drive time, tune-out rate increases — even for familiar tracks. Long tracks may need radio edits for drive time.',
    aiSelfReflection: 'I predicted Hotel California would perform well (familiarity 0.95) but overlooked duration. Adding duration as a factor in drive-time scoring.',
    weather: 'cloudy, 21°C', daypart: 'afternoon-drive', isReal: false,
  },
  {
    date: '2026-07-10',
    alt: 19.1, listeners: 1492,
    biggestSuccess: 'AI DJ voice link at 6:58 mentioned "2 minutes to news at 7" — retention spiked. Listeners stayed through the news because they were primed.',
    biggestMistake: 'Forgot to schedule jingle at 8:30. Brand recall consistency matters — station ID frequency is part of our identity.',
    biggestSurprise: 'Overnight segment had 3 new listeners at 2:30am. Usually overnight is stable. Maybe a social media post from earlier drove traffic?',
    whatWouldWeDoDifferently: 'Add "news teaser" pattern to AI DJ voice links before scheduled news. The priming effect is strong.',
    newHypothesis: 'If AI DJ teases upcoming content ("news in 2 minutes"), retention through the teased content increases by 10%+.',
    aiSelfReflection: 'The news teaser was an emergent behavior from the show-prep module. I should incorporate this pattern into station-brain decisions.',
    weather: 'rainy, 18°C', daypart: 'morning-drive + overnight', isReal: false,
  },
  {
    date: '2026-07-09',
    alt: 18.4, listeners: 1421,
    biggestSuccess: 'Contest mention at 7:45 generated 34 new listener sessions in 5 minutes. Biggest contest-driven spike this month.',
    biggestMistake: 'AI Station Brain predicted +2.5min ALT from playing Everlong at 8:15. Actual was +0.8min. Overestimated — Everlong was played yesterday at similar time.',
    biggestSurprise: 'An older listener (67, Diamond tier) called in to say she noticed the station sounds "smarter" lately. Unsolicited positive feedback about AI programming.',
    whatWouldWeDoDifferently: 'Check 24h play history before scheduling power tracks. Everlong fatigue at 24h interval is real — extend to 48h for familiar tracks.',
    newHypothesis: 'If a power track was played in the same daypart yesterday, its ALT impact drops by 60%. Familiarity has a 48h half-life for power tracks.',
    aiSelfReflection: 'I overestimated Everlong\'s impact because I didn\'t check 24h play history. Adding recent-play penalty to my demand scoring model.',
    weather: 'sunny, 26°C', daypart: 'morning-drive', isReal: false,
  },
  {
    date: '2026-07-08',
    alt: 18.9, listeners: 1503,
    biggestSuccess: 'First day with all 8 optimizer objectives meeting targets. ALT 18.9, return rate 34%, diversity 11.2 artists/hr, compliance 100%.',
    biggestMistake: 'No major mistakes today — but no major insights either. A "steady" day. Should we be worried about complacency?',
    biggestSurprise: 'Evening segment (19:00-22:00) had higher ALT than morning drive for the first time. Maybe the deep cuts programming is working?',
    whatWouldWeDoDifferently: 'Investigate why evening outperformed morning. Is it the programming, the weather, or a one-off? Need 7 days of data.',
    newHypothesis: 'If evening deep-cuts programming consistently outperforms morning hits, our listener base may be shifting from commuters to enthusiasts.',
    aiSelfReflection: 'All objectives met today — but I should not over-optimize for one good day. Need to see if this is sustainable or variance.',
    weather: 'clear, 23°C', daypart: 'all-day', isReal: false,
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

    // 5. Station Journal — dnevni dnevnik postaje
    stationJournal: JOURNAL,

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
      // Lesson confidence distribution
      veryHighConfidence: LESSONS.filter(l => l.confidence.level === 'very-high').length,
      highConfidence: LESSONS.filter(l => l.confidence.level === 'high').length,
      mediumConfidence: LESSONS.filter(l => l.confidence.level === 'medium').length,
      lowConfidence: LESSONS.filter(l => l.confidence.level === 'low').length,
      // Prediction accuracy
      avgPredictionError: Math.round(DECISION_HISTORY.reduce((s, d) => s + (d.predictionError ?? 0), 0) / DECISION_HISTORY.length * 10) / 10,
      overestimationCount: DECISION_HISTORY.filter(d => (d.predictionError ?? 0) < 0).length,
      underestimationCount: DECISION_HISTORY.filter(d => (d.predictionError ?? 0) > 0).length,
      // Journal
      journalEntries: JOURNAL.length,
      hypothesesGenerated: JOURNAL.filter(j => j.newHypothesis).length,
      // Honesty
      realEvidenceCount: DECISION_HISTORY.filter(d => d.isReal).length, // 0
      realJournalEntries: JOURNAL.filter(j => j.isReal).length, // 0
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
      expectedAlt: body.expectedAlt ?? body.altAfter ?? 0,
      actualAlt: body.actualAlt ?? body.altAfter ?? 0,
      predictionError: 0,
      whyWrong: body.whyWrong,
      triedFor: body.triedFor ?? 'ongoing',
      lesson: body.lesson ?? 'To be determined',
      retryVerdict: body.retryVerdict ?? 'TBD',
      evidenceType: body.evidenceType ?? 'observational',
      isReal: false,
    }
    entry.altDelta = entry.altAfter - entry.altBefore
    entry.predictionError = entry.actualAlt - entry.expectedAlt
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
      confidence: {
        level: body.confidenceLevel ?? 'experimental',
        timesObserved: body.timesObserved ?? 1,
        yearsObserved: 0,
        lastConfirmed: null,
        isReal: false,
      },
      usedBy: body.usedBy ?? [],
    }
    LESSONS.unshift(lesson)
    return NextResponse.json({ ok: true, lesson, message: 'Institutional lesson recorded' })
  }

  if (body.action === 'add-journal' && body.date) {
    const entry: JournalEntry = {
      date: body.date,
      alt: body.alt ?? 0, listeners: body.listeners ?? 0,
      biggestSuccess: body.biggestSuccess ?? '',
      biggestMistake: body.biggestMistake ?? '',
      biggestSurprise: body.biggestSurprise ?? '',
      whatWouldWeDoDifferently: body.whatWouldWeDoDifferently ?? '',
      newHypothesis: body.newHypothesis ?? '',
      aiSelfReflection: body.aiSelfReflection ?? '',
      weather: body.weather ?? '', daypart: body.daypart ?? '',
      isReal: false,
    }
    JOURNAL.unshift(entry)
    return NextResponse.json({ ok: true, entry, message: 'Journal entry recorded — station memory grows' })
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
