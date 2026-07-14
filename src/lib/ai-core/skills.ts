/**
 * Skill Library — standardizirane veščine ki jih AI sestavlja glede na situacijo.
 *
 * Namesto dolgih promptov — AI uporablja sposobnosti.
 * Vsaka skill ima: trigger, procedure, tools, guardrails, success criteria.
 */

export interface Skill {
  id: string
  name: string
  description: string
  // When to activate
  triggers: string[] // keywords or conditions
  // Procedure (step-by-step)
  steps: { step: number; action: string; tool?: string; description: string }[]
  // Tools needed
  requiredTools: string[]
  // Guardrails
  guardrails: string[]
  // Success criteria
  successCriteria: string
  // Memory used
  memoryTypes: ('working' | 'semantic' | 'episode' | 'procedural')[]
}

const SKILLS: Skill[] = [
  {
    id: 'skill-morning-show',
    name: 'Morning Show',
    description: 'Standard jutranji program: novice, vreme, promet, hiti, voice linki',
    triggers: ['morning', 'jutranji', '06:00', '07:00', '08:00', 'drive'],
    steps: [
      { step: 1, action: 'Check schedule', tool: 'get_schedule', description: 'Verify morning clock is active' },
      { step: 2, action: 'Check now playing', tool: 'get_now_playing', description: 'Current track status' },
      { step: 3, action: 'Verify news at 7:00 and 8:00', description: 'CRITICAL: news is anchor, cannot skip' },
      { step: 4, action: 'Prepare traffic update', description: 'Every 20min during 7-9am' },
      { step: 5, action: 'Prepare weather mention', description: 'In voice links' },
      { step: 6, action: 'Ensure hit frequency', description: 'Power track every 12-15min' },
    ],
    requiredTools: ['get_schedule', 'get_now_playing', 'get_station_brain'],
    guardrails: ['News at 7:00 and 8:00 is MANDATORY (confirmed 2019 + 2024)', 'No two low-energy tracks before 10:00', 'Traffic every 20min during rush'],
    successCriteria: 'ALT > 20min for morning segment, return rate > 40%',
    memoryTypes: ['procedural', 'semantic', 'episode'],
  },
  {
    id: 'skill-breaking-news',
    name: 'Breaking News',
    description: 'Hitro odzivanje na novice — prekinitev programa, priprava bulletina',
    triggers: ['breaking', 'nujno', 'news flash', 'emergency news', 'zadnja minuto'],
    steps: [
      { step: 1, action: 'Assess urgency', description: 'Is this truly breaking or can it wait for scheduled news?' },
      { step: 2, action: 'Fade current track', description: 'Quick fade (2s) to news bed' },
      { step: 3, action: 'Play news intro', description: 'Standard news bed (3s)' },
      { step: 4, action: 'Read bulletin', description: 'AI DJ reads the news via TTS' },
      { step: 5, action: 'Return to music', description: 'Resume with familiar hit' },
      { step: 6, action: 'Log to journal', description: 'Record breaking news event' },
    ],
    requiredTools: ['get_now_playing', 'get_station_brain'],
    guardrails: ['EAS alerts override everything', 'Do not interrupt EAS test or actual alert', 'Return with familiar hit after news'],
    successCriteria: 'News delivered within 60s of trigger, no dead air, minimal listener drop',
    memoryTypes: ['procedural', 'episode'],
  },
  {
    id: 'skill-emergency',
    name: 'Emergency Broadcast',
    description: 'EAS/CAP alert handling — program interruption za emergency',
    triggers: ['EAS', 'CAP', 'emergency', 'tornado', 'fire', 'evacuation', 'alert'],
    steps: [
      { step: 1, action: 'Verify alert', description: 'Check CAP signature + replay protection' },
      { step: 2, action: 'Determine severity', description: 'Extreme/Severe → auto-interrupt' },
      { step: 3, action: 'Execute 7-step interrupt', description: 'Fade → header → attention → SAME → TTS → EOM → restore' },
      { step: 4, action: 'Log to FCC EasLog', description: 'Mandatory 4-year retention' },
      { step: 5, action: 'Notify engineer', description: 'Page on-call via PagerDuty' },
    ],
    requiredTools: ['get_station_brain'],
    guardrails: ['EAS overrides ALL programming', 'FCC compliance mandatory', 'No ads during EAS'],
    successCriteria: 'Interrupt completed <40s, FCC log created, no dead air',
    memoryTypes: ['procedural', 'episode'],
  },
  {
    id: 'skill-contest',
    name: 'Contest Management',
    description: 'Priprava in izvedba natečaja z listener engagement',
    triggers: ['contest', 'natečaj', 'giveaway', 'win', 'prize', 'tickets'],
    steps: [
      { step: 1, action: 'Prepare contest details', description: 'Prize, rules, entry method' },
      { step: 2, action: 'Schedule mentions', description: 'Every 30min during drive time' },
      { step: 3, action: 'Generate social posts', description: 'Twitter, Instagram, Facebook' },
      { step: 4, action: 'Track entries', description: 'Listener requests + loyalty points' },
      { step: 5, action: 'Draw winner', description: 'Random from eligible entries' },
      { step: 6, action: 'Announce on air', description: 'AI DJ announces winner' },
    ],
    requiredTools: ['get_now_playing', 'get_station_brain', 'get_listener_insights'],
    guardrails: ['Legal compliance (gambling laws)', 'Fair selection', 'Winner consent'],
    successCriteria: 'Contest generates +5% listener spike, >100 entries, positive sentiment',
    memoryTypes: ['procedural', 'episode'],
  },
  {
    id: 'skill-rock-rotation',
    name: 'Rock Rotation',
    description: 'Standardna glasbena rotacija z separation rules in energy management',
    triggers: ['rotation', 'playlist', 'schedule', 'music', 'tracks', 'glasba'],
    steps: [
      { step: 1, action: 'Get active clock', tool: 'get_schedule', description: 'Determine daypart + category percentages' },
      { step: 2, action: 'Check separation rules', description: 'Artist 3h, title 6h, BPM ±15, key ±2' },
      { step: 3, action: 'Check conflict rules', description: 'DMCA, explicit-daypart, brand-competitor' },
      { step: 4, action: 'Compute demand scores', description: 'Rotation budget vs actual plays' },
      { step: 5, action: 'Backtrack fill', description: 'Skip hard violations, pick highest demand' },
      { step: 6, action: 'Verify energy curve', description: 'No two <0.5 consecutive in daytime' },
    ],
    requiredTools: ['get_schedule', 'get_knowledge', 'get_station_memory'],
    guardrails: ['Compliance = 100%', 'Diversity ≥ 8 artists/hr', 'No two low-energy consecutive (daytime)'],
    successCriteria: 'Schedule fills all slots, 0 hard violations, avg demand > 0',
    memoryTypes: ['semantic', 'procedural'],
  },
  {
    id: 'skill-interview',
    name: 'Interview',
    description: 'Priprava in izvedba intervja z gostom',
    triggers: ['interview', 'gost', 'guest', 'pogovor', 'vprašanja'],
    steps: [
      { step: 1, action: 'Research guest', description: 'Background, recent work, interesting facts' },
      { step: 2, action: 'Prepare questions', description: '5-7 open-ended questions, organized by theme' },
      { step: 3, action: 'Prepare intro', description: 'Guest bio + why they are here' },
      { step: 4, action: 'Schedule time slot', description: 'During drive time for maximum reach' },
      { step: 5, action: 'Conduct interview', description: 'AI DJ or human host asks questions' },
      { step: 6, action: 'Prepare highlight clips', description: 'For social media' },
    ],
    requiredTools: ['get_schedule', 'get_station_memory'],
    guardrails: ['Respect guest time (max 15min)', 'No controversial questions without approval', 'Backup questions ready'],
    successCriteria: 'Interview completed on time, guest satisfied, social clips generated',
    memoryTypes: ['procedural', 'episode'],
  },
  {
    id: 'skill-live-concert',
    name: 'Live Concert',
    description: 'Prenos koncerta v živo z introdukcijo in komentari',
    triggers: ['concert', 'koncert', 'live', 'v živo', 'performance', 'festival'],
    steps: [
      { step: 1, action: 'Verify stream source', description: 'SRT or WebRTC connection check' },
      { step: 2, action: 'Prepare intro', description: 'Artist background + setlist preview' },
      { step: 3, action: 'Schedule break', description: 'Ad break before concert starts' },
      { step: 4, action: 'Monitor stream', description: 'Check audio levels + connectivity' },
      { step: 5, action: 'Provide commentary', description: 'Between songs, AI DJ commentary' },
      { step: 6, action: 'Post-concert', description: 'Return to regular programming + social posts' },
    ],
    requiredTools: ['get_now_playing', 'get_station_brain'],
    guardrails: ['Stream latency <500ms for SRT', 'Backup playlist ready if stream fails', 'Audio levels monitored continuously'],
    successCriteria: 'Concert broadcast without interruption, listener spike >20%, positive social sentiment',
    memoryTypes: ['procedural', 'episode'],
  },
]

/**
 * Find matching skills for a question/context.
 */
export function findMatchingSkills(question: string): Skill[] {
  const q = question.toLowerCase()
  return SKILLS.filter(skill =>
    skill.triggers.some(trigger => q.includes(trigger.toLowerCase()))
  )
}

/**
 * Get all skills.
 */
export function getAllSkills(): Skill[] {
  return SKILLS
}

export { SKILLS }
