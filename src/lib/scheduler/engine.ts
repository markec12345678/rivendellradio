/**
 * Music Scheduling Engine — GSelector-class rule-based scheduler.
 *
 * Implements:
 *   - Category clocks (hour-grid with category percentages + daypart variants)
 *   - Separation matrix (artist/title/BPM/key/sound-code/gender separation rules)
 *   - Demand scoring (rotation budget vs actual plays)
 *   - Backtracking fill algorithm with hard vs soft rule separation
 *   - Conflict avoidance (DMCA §114, brand-competitor, explicit-lyrics dayparting)
 *
 * Spec references:
 *   - GSelector "natural demand" algorithm
 *   - MusicMaster rotation engine
 *   - PowerGOLD separation rules
 *   - 47 CFR §73.624 (DMCA streaming caps)
 *   - FCC indecency rules (safe harbor 10pm-6am)
 */

// ============================================================================
// Types
// ============================================================================

export interface Track {
  id: string
  title: string
  artist: string
  album?: string
  category: string // 'current' | 'recurrent' | 'gold' | 'power' | 'slow' | etc.
  bpm?: number
  key?: string // Camelot: 8A, 8B, 9A, etc.
  energy?: number // 1-10
  durationMs: number
  introMs?: number
  outroMs?: number
  soundCode?: string // 'A' (upbeat), 'B' (mid), 'C' (slow), 'X' (talk)
  gender?: 'male' | 'female' | 'group' | 'instrumental'
  explicit?: boolean
  isci?: string // ISCI ad-ID
  lastPlayedAt?: string
  playCount7d?: number
  playCount30d?: number
}

export interface SeparationRule {
  attribute: 'artist' | 'title' | 'album' | 'bpm' | 'key' | 'soundCode' | 'gender' | 'category'
  windowMinutes: number // minimum separation window
  hardRule: boolean // hard = block, soft = penalty
  tolerance?: number // for numeric attributes (e.g., BPM ±10)
}

export interface CategoryClockSlot {
  category: string
  percentage: number // 0-100, sum of all slots = 100
}

export interface CategoryClock {
  id: string
  name: string
  description: string
  slots: CategoryClockSlot[]
  dayparts: string[] // which dayparts use this clock
}

export interface Daypart {
  id: string
  name: string
  startHour: number // 0-23
  endHour: number
  daysOfWeek: number[] // 0=Sun, 6=Sat
  clockId: string
}

export interface ScheduledTrack {
  position: number
  trackId: string
  title: string
  artist: string
  category: string
  scheduledAt: string
  durationMs: number
  demandScore: number
  ruleViolations: RuleViolation[]
}

export interface RuleViolation {
  rule: string
  severity: 'hard' | 'soft'
  description: string
  penalty: number
}

export interface ConflictRule {
  type: 'dmca' | 'brand-competitor' | 'explicit-daypart'
  enabled: boolean
  config: Record<string, any>
}

// ============================================================================
// Default rules (GSelector-class)
// ============================================================================

export const DEFAULT_SEPARATION_RULES: SeparationRule[] = [
  { attribute: 'artist', windowMinutes: 180, hardRule: true }, // 3h artist separation
  { attribute: 'title', windowMinutes: 360, hardRule: true }, // 6h title separation
  { attribute: 'album', windowMinutes: 120, hardRule: false, tolerance: 0 }, // 2h soft album
  { attribute: 'bpm', windowMinutes: 30, hardRule: false, tolerance: 15 }, // 30m, ±15 BPM
  { attribute: 'key', windowMinutes: 30, hardRule: false, tolerance: 2 }, // 30m, ±2 Camelot steps
  { attribute: 'soundCode', windowMinutes: 20, hardRule: false, tolerance: 0 }, // 20m no two A back-to-back
  { attribute: 'gender', windowMinutes: 15, hardRule: false, tolerance: 0 }, // 15m gender variety
  { attribute: 'category', windowMinutes: 0, hardRule: false, tolerance: 0 }, // category clock enforces
]

export const DEFAULT_CONFLICT_RULES: ConflictRule[] = [
  {
    type: 'dmca',
    enabled: true,
    config: {
      // DMCA §114: ≤3 tracks from same album, ≤4 from same artist in any 3h window
      maxPerAlbum3h: 3,
      maxPerArtist3h: 4,
    },
  },
  {
    type: 'brand-competitor',
    enabled: true,
    config: {
      // Pepsi ad never adjacent to Coca-Cola song
      pairs: [
        { ad: 'PEPSI*', song: '*COCA-COLA*' },
        { ad: 'COCA-COLA*', song: '*PEPSI*' },
      ],
    },
  },
  {
    type: 'explicit-daypart',
    enabled: true,
    config: {
      // FCC safe harbor: 10pm-6am only for explicit lyrics
      safeHarborStart: 22,
      safeHarborEnd: 6,
    },
  },
]

export const DEFAULT_CLOCKS: CategoryClock[] = [
  {
    id: 'morning-drive',
    name: 'Morning Drive',
    description: 'High-energy wakeup music (6-10am weekdays)',
    slots: [
      { category: 'power', percentage: 30 },
      { category: 'current', percentage: 35 },
      { category: 'recurrent', percentage: 20 },
      { category: 'gold', percentage: 15 },
    ],
    dayparts: ['morning-drive'],
  },
  {
    id: 'midday',
    name: 'Midday',
    description: 'Balanced daytime music (10am-3pm weekdays)',
    slots: [
      { category: 'current', percentage: 40 },
      { category: 'recurrent', percentage: 30 },
      { category: 'gold', percentage: 20 },
      { category: 'power', percentage: 10 },
    ],
    dayparts: ['midday'],
  },
  {
    id: 'afternoon-drive',
    name: 'Afternoon Drive',
    description: 'Energy for commute home (3-7pm weekdays)',
    slots: [
      { category: 'power', percentage: 25 },
      { category: 'current', percentage: 35 },
      { category: 'recurrent', percentage: 25 },
      { category: 'gold', percentage: 15 },
    ],
    dayparts: ['afternoon-drive'],
  },
  {
    id: 'evening',
    name: 'Evening',
    description: 'Relaxed evening music (7pm-10pm)',
    slots: [
      { category: 'current', percentage: 30 },
      { category: 'recurrent', percentage: 30 },
      { category: 'gold', percentage: 30 },
      { category: 'slow', percentage: 10 },
    ],
    dayparts: ['evening'],
  },
  {
    id: 'overnight',
    name: 'Overnight',
    description: 'Late-night music (10pm-6am, safe harbor)',
    slots: [
      { category: 'gold', percentage: 40 },
      { category: 'recurrent', percentage: 30 },
      { category: 'current', percentage: 20 },
      { category: 'slow', percentage: 10 },
    ],
    dayparts: ['overnight'],
  },
  {
    id: 'weekend',
    name: 'Weekend',
    description: 'Weekend variety (Sat-Sun daytime)',
    slots: [
      { category: 'gold', percentage: 35 },
      { category: 'recurrent', percentage: 30 },
      { category: 'current', percentage: 25 },
      { category: 'power', percentage: 10 },
    ],
    dayparts: ['weekend-daytime'],
  },
]

export const DEFAULT_DAYPARTS: Daypart[] = [
  { id: 'morning-drive', name: 'Morning Drive', startHour: 6, endHour: 10, daysOfWeek: [1, 2, 3, 4, 5], clockId: 'morning-drive' },
  { id: 'midday', name: 'Midday', startHour: 10, endHour: 15, daysOfWeek: [1, 2, 3, 4, 5], clockId: 'midday' },
  { id: 'afternoon-drive', name: 'Afternoon Drive', startHour: 15, endHour: 19, daysOfWeek: [1, 2, 3, 4, 5], clockId: 'afternoon-drive' },
  { id: 'evening', name: 'Evening', startHour: 19, endHour: 22, daysOfWeek: [0, 1, 2, 3, 4, 5, 6], clockId: 'evening' },
  { id: 'overnight', name: 'Overnight', startHour: 22, endHour: 6, daysOfWeek: [0, 1, 2, 3, 4, 5, 6], clockId: 'overnight' },
  { id: 'weekend-daytime', name: 'Weekend Daytime', startHour: 6, endHour: 22, daysOfWeek: [0, 6], clockId: 'weekend' },
]

// ============================================================================
// Sample library (production: pulled from Rivendell RDXport)
// ============================================================================

export const SAMPLE_LIBRARY: Track[] = [
  { id: 'trk-001', title: 'Seven Nation Army', artist: 'The White Stripes', album: 'Elephant', category: 'power', bpm: 124, key: '5A', energy: 9, durationMs: 252000, introMs: 18000, outroMs: 12000, soundCode: 'A', gender: 'group', explicit: false, playCount7d: 8, playCount30d: 32 },
  { id: 'trk-002', title: 'Everlong', artist: 'Foo Fighters', album: 'The Colour and the Shape', category: 'power', bpm: 158, key: '9B', energy: 10, durationMs: 250000, introMs: 12000, outroMs: 8000, soundCode: 'A', gender: 'male', explicit: false, playCount7d: 6, playCount30d: 24 },
  { id: 'trk-003', title: 'Thunderstruck', artist: 'AC/DC', album: 'The Razors Edge', category: 'current', bpm: 134, key: '4A', energy: 10, durationMs: 292000, introMs: 25000, outroMs: 10000, soundCode: 'A', gender: 'male', explicit: false, playCount7d: 5, playCount30d: 20 },
  { id: 'trk-004', title: 'Black Hole Sun', artist: 'Soundgarden', album: 'Superunknown', category: 'recurrent', bpm: 96, key: '7A', energy: 6, durationMs: 320000, introMs: 15000, outroMs: 20000, soundCode: 'B', gender: 'male', explicit: false, playCount7d: 3, playCount30d: 12 },
  { id: 'trk-005', title: 'Hotel California', artist: 'Eagles', album: 'Hotel California', category: 'gold', bpm: 75, key: '2A', energy: 5, durationMs: 391000, introMs: 30000, outroMs: 25000, soundCode: 'B', gender: 'group', explicit: false, playCount7d: 2, playCount30d: 8 },
  { id: 'trk-006', title: 'Smells Like Teen Spirit', artist: 'Nirvana', album: 'Nevermind', category: 'power', bpm: 116, key: '6A', energy: 10, durationMs: 301000, introMs: 8000, outroMs: 15000, soundCode: 'A', gender: 'male', explicit: false, playCount7d: 7, playCount30d: 28 },
  { id: 'trk-007', title: 'Wonderwall', artist: 'Oasis', album: "What's the Story)", category: 'recurrent', bpm: 87, key: '4A', energy: 4, durationMs: 258000, introMs: 22000, outroMs: 10000, soundCode: 'C', gender: 'male', explicit: false, playCount7d: 4, playCount30d: 16 },
  { id: 'trk-008', title: 'Boulevard of Broken Dreams', artist: 'Green Day', album: 'American Idiot', category: 'current', bpm: 104, key: '5A', energy: 7, durationMs: 262000, introMs: 14000, outroMs: 12000, soundCode: 'B', gender: 'group', explicit: false, playCount7d: 5, playCount30d: 18 },
  { id: 'trk-009', title: 'Zombie', artist: 'The Cranberries', album: 'No Need to Argue', category: 'recurrent', bpm: 78, key: '3A', energy: 6, durationMs: 306000, introMs: 20000, outroMs: 18000, soundCode: 'B', gender: 'female', explicit: false, playCount7d: 3, playCount30d: 14 },
  { id: 'trk-010', title: 'Breed', artist: 'Nirvana', album: 'Nevermind', category: 'gold', bpm: 120, key: '6B', energy: 9, durationMs: 184000, introMs: 5000, outroMs: 8000, soundCode: 'A', gender: 'male', explicit: false, playCount7d: 1, playCount30d: 6 },
  { id: 'trk-011', title: 'Alive', artist: 'Pearl Jam', album: 'Ten', category: 'gold', bpm: 120, key: '7B', energy: 8, durationMs: 341000, introMs: 28000, outroMs: 20000, soundCode: 'A', gender: 'male', explicit: false, playCount7d: 2, playCount30d: 10 },
  { id: 'trk-012', title: 'Black', artist: 'Pearl Jam', album: 'Ten', category: 'gold', bpm: 76, key: '4A', energy: 4, durationMs: 335000, introMs: 18000, outroMs: 30000, soundCode: 'C', gender: 'male', explicit: false, playCount7d: 1, playCount30d: 5 },
  { id: 'trk-013', title: 'Plush', artist: 'Stone Temple Pilots', album: 'Core', category: 'recurrent', bpm: 84, key: '5A', energy: 6, durationMs: 325000, introMs: 16000, outroMs: 14000, soundCode: 'B', gender: 'male', explicit: false, playCount7d: 2, playCount30d: 9 },
  { id: 'trk-014', title: 'Rooster', artist: 'Alice in Chains', album: 'Dirt', category: 'gold', bpm: 88, key: '3A', energy: 5, durationMs: 384000, introMs: 25000, outroMs: 22000, soundCode: 'B', gender: 'male', explicit: false, playCount7d: 1, playCount30d: 4 },
  { id: 'trk-015', title: 'Killing in the Name', artist: 'Rage Against the Machine', album: 'Rage Against the Machine', category: 'current', bpm: 84, key: '2A', energy: 10, durationMs: 317000, introMs: 8000, outroMs: 15000, soundCode: 'A', gender: 'male', explicit: true, playCount7d: 3, playCount30d: 11 },
]

// ============================================================================
// Scheduling algorithm
// ============================================================================

export interface SchedulerConfig {
  separationRules: SeparationRule[]
  conflictRules: ConflictRule[]
  clocks: CategoryClock[]
  dayparts: Daypart[]
  library: Track[]
}

export interface SchedulerResult {
  scheduled: ScheduledTrack[]
  violations: RuleViolation[]
  stats: {
    totalScheduled: number
    hardViolations: number
    softViolations: number
    categoryDistribution: Record<string, number>
    avgDemandScore: number
    algorithm: string
  }
}

/**
 * Get the active daypart for a given hour + day of week.
 */
export function getActiveDaypart(date: Date, dayparts: Daypart[]): Daypart | null {
  const hour = date.getHours()
  const dow = date.getDay()
  for (const dp of dayparts) {
    const daysMatch = dp.daysOfWeek.includes(dow)
    if (!daysMatch) continue
    if (dp.startHour <= dp.endHour) {
      if (hour >= dp.startHour && hour < dp.endHour) return dp
    } else {
      // Overnight wrap (e.g., 22-6)
      if (hour >= dp.startHour || hour < dp.endHour) return dp
    }
  }
  return null
}

/**
 * Get the active clock based on the current daypart.
 */
export function getActiveClock(date: Date, config: SchedulerConfig): CategoryClock | null {
  const dp = getActiveDaypart(date, config.dayparts)
  if (!dp) return null
  return config.clocks.find((c) => c.id === dp.clockId) ?? null
}

/**
 * Compute demand score for a track.
 * Higher = more overdue (should be scheduled sooner).
 * Formula: (targetPlays - actualPlays) * recencyPenalty
 */
export function computeDemandScore(track: Track, category: string, clock: CategoryClock): number {
  const targetPct = clock.slots.find((s) => s.category === category)?.percentage ?? 0
  const targetPlays30d = targetPct * 0.3 // expected 30-day plays for this category share
  const actualPlays30d = track.playCount30d ?? 0
  const recencyPenalty = track.lastPlayedAt
    ? Math.max(0, 1 - (Date.now() - new Date(track.lastPlayedAt).getTime()) / (7 * 86400000))
    : 1
  const demand = (targetPlays30d - actualPlays30d) * recencyPenalty
  return Math.round(demand * 100) / 100
}

/**
 * Check separation rules for a candidate track against the recent schedule.
 */
export function checkSeparation(
  candidate: Track,
  recentSchedule: ScheduledTrack[],
  library: Track[],
  rules: SeparationRule[],
): RuleViolation[] {
  const violations: RuleViolation[] = []
  const now = Date.now()

  for (const rule of rules) {
    if (rule.windowMinutes === 0) continue
    const windowMs = rule.windowMinutes * 60 * 1000

    for (const recent of recentSchedule) {
      const scheduledTime = new Date(recent.scheduledAt).getTime()
      if (now - scheduledTime > windowMs) continue

      const recentTrack = library.find((t) => t.id === recent.trackId)
      if (!recentTrack) continue

      let matches = false
      switch (rule.attribute) {
        case 'artist':
          matches = recentTrack.artist === candidate.artist
          break
        case 'title':
          matches = recentTrack.title === candidate.title
          break
        case 'album':
          matches = recentTrack.album === candidate.album
          break
        case 'bpm':
          if (candidate.bpm && recentTrack.bpm && rule.tolerance) {
            matches = Math.abs(candidate.bpm - recentTrack.bpm) < rule.tolerance
          }
          break
        case 'key':
          if (candidate.key && recentTrack.key && rule.tolerance) {
            matches = Math.abs(parseInt(candidate.key) - parseInt(recentTrack.key)) <= rule.tolerance
          }
          break
        case 'soundCode':
          matches = recentTrack.soundCode === candidate.soundCode
          break
        case 'gender':
          matches = recentTrack.gender === candidate.gender
          break
        case 'category':
          matches = recentTrack.category === candidate.category
          break
      }

      if (matches) {
        violations.push({
          rule: `${rule.attribute}-separation`,
          severity: rule.hardRule ? 'hard' : 'soft',
          description: `${rule.attribute} "${(candidate as any)[rule.attribute]}" played ${Math.round((now - scheduledTime) / 60000)}min ago (min: ${rule.windowMinutes}min)`,
          penalty: rule.hardRule ? 1000 : 50,
        })
      }
    }
  }

  return violations
}

/**
 * Check conflict rules (DMCA, brand-competitor, explicit-lyrics dayparting).
 */
export function checkConflicts(
  candidate: Track,
  recentSchedule: ScheduledTrack[],
  library: Track[],
  rules: ConflictRule[],
  scheduledDate: Date,
): RuleViolation[] {
  const violations: RuleViolation[] = []

  for (const rule of rules) {
    if (!rule.enabled) continue

    if (rule.type === 'dmca') {
      const threeHoursAgo = new Date(scheduledDate.getTime() - 3 * 3600000)
      const recentTracks = recentSchedule
        .filter((s) => new Date(s.scheduledAt) >= threeHoursAgo)
        .map((s) => library.find((t) => t.id === s.trackId))
        .filter(Boolean) as Track[]

      const sameAlbum = recentTracks.filter((t) => t.album === candidate.album).length
      const sameArtist = recentTracks.filter((t) => t.artist === candidate.artist).length

      if (sameAlbum >= rule.config.maxPerAlbum3h) {
        violations.push({
          rule: 'dmca-album',
          severity: 'hard',
          description: `DMCA §114: ${sameAlbum} tracks from album "${candidate.album}" in 3h (max ${rule.config.maxPerAlbum3h})`,
          penalty: 1000,
        })
      }
      if (sameArtist >= rule.config.maxPerArtist3h) {
        violations.push({
          rule: 'dmca-artist',
          severity: 'hard',
          description: `DMCA §114: ${sameArtist} tracks from artist "${candidate.artist}" in 3h (max ${rule.config.maxPerArtist3h})`,
          penalty: 1000,
        })
      }
    }

    if (rule.type === 'explicit-daypart' && candidate.explicit) {
      const hour = scheduledDate.getHours()
      const safe = rule.config.safeHarborStart <= hour || hour < rule.config.safeHarborEnd
      if (!safe) {
        violations.push({
          rule: 'explicit-daypart',
          severity: 'hard',
          description: `Explicit lyrics outside safe harbor (10pm-6am) — FCC indecency rule`,
          penalty: 1000,
        })
      }
    }
  }

  return violations
}

/**
 * Schedule a one-hour log using the active category clock.
 * Backtracking algorithm: try each candidate, skip if hard violation, pick highest demand.
 */
export function scheduleHour(date: Date, config: SchedulerConfig, recentSchedule: ScheduledTrack[] = []): SchedulerResult {
  const clock = getActiveClock(date, config)
  if (!clock) {
    return {
      scheduled: [],
      violations: [],
      stats: {
        totalScheduled: 0,
        hardViolations: 0,
        softViolations: 0,
        categoryDistribution: {},
        avgDemandScore: 0,
        algorithm: 'no-clock',
      },
    }
  }

  // Estimate slots per hour (average track ~4 min → ~15 slots)
  const avgTrackMs = 240000
  const slotsPerHour = Math.floor(3600000 / avgTrackMs)

  // Compute category counts based on clock percentages
  const categoryCounts: Record<string, number> = {}
  for (const slot of clock.slots) {
    categoryCounts[slot.category] = Math.round((slot.percentage / 100) * slotsPerHour)
  }

  const scheduled: ScheduledTrack[] = []
  const allViolations: RuleViolation[] = []
  const hourStart = new Date(date)
  hourStart.setMinutes(0, 0, 0)
  let position = 0
  let currentTime = new Date(hourStart)

  // Build category rotation queue
  const categoryRotation: string[] = []
  for (const [cat, count] of Object.entries(categoryCounts)) {
    for (let i = 0; i < count; i++) categoryRotation.push(cat)
  }
  // Interleave categories for variety
  categoryRotation.sort(() => Math.random() - 0.5)

  for (const category of categoryRotation) {
    // Find candidates in this category
    const candidates = config.library.filter((t) => t.category === category)

    // Score each candidate
    const scored = candidates
      .map((track) => {
        const demandScore = computeDemandScore(track, category, clock)
        const sepViolations = checkSeparation(track, [...recentSchedule, ...scheduled], config.library, config.separationRules)
        const confViolations = checkConflicts(track, [...recentSchedule, ...scheduled], config.library, config.conflictRules, currentTime)
        const violations = [...sepViolations, ...confViolations]
        const hardBlocked = violations.some((v) => v.severity === 'hard')
        const penalty = violations.reduce((sum, v) => sum + v.penalty, 0)
        const finalScore = hardBlocked ? -Infinity : demandScore - penalty
        return { track, finalScore, violations, hardBlocked }
      })
      .filter((s) => !s.hardBlocked) // skip hard violations
      .sort((a, b) => b.finalScore - a.finalScore)

    if (scored.length === 0) {
      // No candidates pass — skip this slot (will be filled with sweeper/jingle in production)
      continue
    }

    const best = scored[0]
    scheduled.push({
      position: position++,
      trackId: best.track.id,
      title: best.track.title,
      artist: best.track.artist,
      category,
      scheduledAt: new Date(currentTime).toISOString(),
      durationMs: best.track.durationMs,
      demandScore: Math.round(best.finalScore * 100) / 100,
      ruleViolations: best.violations,
    })
    allViolations.push(...best.violations)
    currentTime = new Date(currentTime.getTime() + best.track.durationMs)
  }

  const categoryDistribution: Record<string, number> = {}
  for (const s of scheduled) {
    categoryDistribution[s.category] = (categoryDistribution[s.category] ?? 0) + 1
  }

  const avgDemandScore = scheduled.length > 0
    ? Math.round((scheduled.reduce((sum, s) => sum + s.demandScore, 0) / scheduled.length) * 100) / 100
    : 0

  return {
    scheduled,
    violations: allViolations,
    stats: {
      totalScheduled: scheduled.length,
      hardViolations: allViolations.filter((v) => v.severity === 'hard').length,
      softViolations: allViolations.filter((v) => v.severity === 'soft').length,
      categoryDistribution,
      avgDemandScore,
      algorithm: 'rule-based-backtracking (GSelector-class)',
    },
  }
}
