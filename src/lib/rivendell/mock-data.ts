import type { Track, Station, ScheduleShow, Daemon, SystemStatus } from './types'

// ============================================================================
// REAL ROCK TRACKS — legitimate library data (real artists, real titles)
// Classic rock, alternative, hard rock, indie rock — a real radio library
// ============================================================================

export const rockTracks: Track[] = [
  // Classic Rock
  { id: 't001', title: 'Back in Black', artist: 'AC/DC', album: 'Back in Black', genre: 'Hard Rock', length: 253000, type: 'music', bpm: 127, year: 1980, isrc: 'AUAP08000012', group: 'MUSIC', origin: 'cd', schedCodes: ['M', 'R'], playCount: 1247, lastPlayed: new Date(Date.now() - 3600000).toISOString() },
  { id: 't002', title: 'Highway to Hell', artist: 'AC/DC', album: 'Highway to Hell', genre: 'Hard Rock', length: 208000, type: 'music', bpm: 116, year: 1979, isrc: 'AUAP79000011', group: 'MUSIC', origin: 'cd', schedCodes: ['M', 'R'], playCount: 983, lastPlayed: new Date(Date.now() - 7200000).toISOString() },
  { id: 't003', title: 'Thunderstruck', artist: 'AC/DC', album: 'The Razors Edge', genre: 'Hard Rock', length: 292000, type: 'music', bpm: 133, year: 1990, isrc: 'AUAP90000009', group: 'MUSIC', origin: 'cd', schedCodes: ['M', 'R'], playCount: 1567, lastPlayed: new Date(Date.now() - 1800000).toISOString() },
  { id: 't004', title: 'Bohemian Rhapsody', artist: 'Queen', album: 'A Night at the Opera', genre: 'Classic Rock', length: 354000, type: 'music', bpm: 72, year: 1975, isrc: 'GBUM75000001', group: 'MUSIC', origin: 'cd', schedCodes: ['M', 'R'], playCount: 2104, lastPlayed: new Date(Date.now() - 900000).toISOString() },
  { id: 't005', title: 'We Will Rock You', artist: 'Queen', album: 'News of the World', genre: 'Classic Rock', length: 122000, type: 'music', bpm: 81, year: 1977, isrc: 'GBUM77000002', group: 'MUSIC', origin: 'cd', schedCodes: ['M', 'R'], playCount: 1893, lastPlayed: new Date(Date.now() - 5400000).toISOString() },
  { id: 't006', title: 'Don\'t Stop Believin\'', artist: 'Journey', album: 'Escape', genre: 'Classic Rock', length: 251000, type: 'music', bpm: 119, year: 1981, isrc: 'USSM18100012', group: 'MUSIC', origin: 'cd', schedCodes: ['M', 'R'], playCount: 2456, lastPlayed: new Date(Date.now() - 2700000).toISOString() },
  { id: 't007', title: 'Sweet Child O\' Mine', artist: 'Guns N\' Roses', album: 'Appetite for Destruction', genre: 'Hard Rock', length: 356000, type: 'music', bpm: 126, year: 1987, isrc: 'USGF87000001', group: 'MUSIC', origin: 'cd', schedCodes: ['M', 'R'], playCount: 1789, lastPlayed: new Date(Date.now() - 14400000).toISOString() },
  { id: 't008', title: 'Welcome to the Jungle', artist: 'Guns N\' Roses', album: 'Appetite for Destruction', genre: 'Hard Rock', length: 273000, type: 'music', bpm: 118, year: 1987, isrc: 'USGF87000002', group: 'MUSIC', origin: 'cd', schedCodes: ['M', 'R'], playCount: 1342, lastPlayed: new Date(Date.now() - 10800000).toISOString() },
  { id: 't009', title: 'Stairway to Heaven', artist: 'Led Zeppelin', album: 'Led Zeppelin IV', genre: 'Classic Rock', length: 482000, type: 'music', bpm: 82, year: 1971, isrc: 'GBUM71000001', group: 'MUSIC', origin: 'cd', schedCodes: ['M', 'R'], playCount: 1934, lastPlayed: new Date(Date.now() - 21600000).toISOString() },
  { id: 't010', title: 'Whole Lotta Love', artist: 'Led Zeppelin', album: 'Led Zeppelin II', genre: 'Classic Rock', length: 334000, type: 'music', bpm: 90, year: 1969, isrc: 'GBUM69000001', group: 'MUSIC', origin: 'cd', schedCodes: ['M', 'R'], playCount: 1123, lastPlayed: new Date(Date.now() - 28800000).toISOString() },
  { id: 't011', title: 'Smoke on the Water', artist: 'Deep Purple', album: 'Machine Head', genre: 'Hard Rock', length: 370000, type: 'music', bpm: 112, year: 1972, isrc: 'GBUM72000001', group: 'MUSIC', origin: 'cd', schedCodes: ['M', 'R'], playCount: 892, lastPlayed: new Date(Date.now() - 36000000).toISOString() },
  { id: 't012', title: 'Paranoid', artist: 'Black Sabbath', album: 'Paranoid', genre: 'Heavy Metal', length: 171000, type: 'music', bpm: 154, year: 1970, isrc: 'GBUM70000001', group: 'MUSIC', origin: 'cd', schedCodes: ['M', 'R'], playCount: 1045, lastPlayed: new Date(Date.now() - 43200000).toISOString() },

  // Alternative / Grunge
  { id: 't013', title: 'Smells Like Teen Spirit', artist: 'Nirvana', album: 'Nevermind', genre: 'Grunge', length: 301000, type: 'music', bpm: 116, year: 1991, isrc: 'USGF91000001', group: 'MUSIC', origin: 'cd', schedCodes: ['M', 'R'], playCount: 2678, lastPlayed: new Date(Date.now() - 1200000).toISOString() },
  { id: 't014', title: 'Come as You Are', artist: 'Nirvana', album: 'Nevermind', genre: 'Grunge', length: 219000, type: 'music', bpm: 120, year: 1991, isrc: 'USGF91000002', group: 'MUSIC', origin: 'cd', schedCodes: ['M', 'R'], playCount: 1543, lastPlayed: new Date(Date.now() - 6800000).toISOString() },
  { id: 't015', title: 'Black Hole Sun', artist: 'Soundgarden', album: 'Superunknown', genre: 'Grunge', length: 320000, type: 'music', bpm: 134, year: 1994, isrc: 'USAM94000001', group: 'MUSIC', origin: 'cd', schedCodes: ['M', 'R'], playCount: 1234, lastPlayed: new Date(Date.now() - 8200000).toISOString() },
  { id: 't016', title: 'Even Flow', artist: 'Pearl Jam', album: 'Ten', genre: 'Grunge', length: 293000, type: 'music', bpm: 126, year: 1991, isrc: 'USEP91000001', group: 'MUSIC', origin: 'cd', schedCodes: ['M', 'R'], playCount: 1456, lastPlayed: new Date(Date.now() - 9600000).toISOString() },
  { id: 't017', title: 'Creep', artist: 'Radiohead', album: 'Pablo Honey', genre: 'Alternative Rock', length: 238000, type: 'music', bpm: 92, year: 1993, isrc: 'GBAP93000001', group: 'MUSIC', origin: 'cd', schedCodes: ['M', 'R'], playCount: 1876, lastPlayed: new Date(Date.now() - 5200000).toISOString() },

  // Modern Rock / Indie
  { id: 't018', title: 'Seven Nation Army', artist: 'The White Stripes', album: 'Elephant', genre: 'Alternative Rock', length: 232000, type: 'music', bpm: 124, year: 2003, isrc: 'USXL03000001', group: 'MUSIC', origin: 'cd', schedCodes: ['M', 'R'], playCount: 2014, lastPlayed: new Date(Date.now() - 3400000).toISOString() },
  { id: 't019', title: 'Use Somebody', artist: 'Kings of Leon', album: 'Only by the Night', genre: 'Alternative Rock', length: 207000, type: 'music', bpm: 104, year: 2008, isrc: 'USRN08000001', group: 'MUSIC', origin: 'cd', schedCodes: ['M', 'R'], playCount: 1342, lastPlayed: new Date(Date.now() - 15600000).toISOString() },
  { id: 't020', title: 'The Pretender', artist: 'Foo Fighters', album: 'Echoes, Silence, Patience & Grace', genre: 'Alternative Rock', length: 269000, type: 'music', bpm: 168, year: 2007, isrc: 'USRN07000001', group: 'MUSIC', origin: 'cd', schedCodes: ['M', 'R'], playCount: 1678, lastPlayed: new Date(Date.now() - 11200000).toISOString() },
  { id: 't021', title: 'Everlong', artist: 'Foo Fighters', album: 'The Colour and the Shape', genre: 'Alternative Rock', length: 250000, type: 'music', bpm: 158, year: 1997, isrc: 'USCA97000001', group: 'MUSIC', origin: 'cd', schedCodes: ['M', 'R'], playCount: 1923, lastPlayed: new Date(Date.now() - 4600000).toISOString() },
  { id: 't022', title: 'Hysteria', artist: 'Muse', album: 'Absolution', genre: 'Alternative Rock', length: 227000, type: 'music', bpm: 94, year: 2003, isrc: 'GBAAR03000001', group: 'MUSIC', origin: 'cd', schedCodes: ['M', 'R'], playCount: 1089, lastPlayed: new Date(Date.now() - 19800000).toISOString() },
  { id: 't023', title: 'Knights of Cydonia', artist: 'Muse', album: 'Black Holes and Revelations', genre: 'Alternative Rock', length: 366000, type: 'music', bpm: 138, year: 2006, isrc: 'GBAAR06000001', group: 'MUSIC', origin: 'cd', schedCodes: ['M', 'R'], playCount: 1267, lastPlayed: new Date(Date.now() - 22400000).toISOString() },
  { id: 't024', title: 'In the End', artist: 'Linkin Park', album: 'Hybrid Theory', genre: 'Nu Metal', length: 216000, type: 'music', bpm: 105, year: 2001, isrc: 'USWB00000001', group: 'MUSIC', origin: 'cd', schedCodes: ['M', 'R'], playCount: 2345, lastPlayed: new Date(Date.now() - 6200000).toISOString() },
  { id: 't025', title: 'Numb', artist: 'Linkin Park', album: 'Meteora', genre: 'Nu Metal', length: 187000, type: 'music', bpm: 110, year: 2003, isrc: 'USWB02000001', group: 'MUSIC', origin: 'cd', schedCodes: ['M', 'R'], playCount: 2156, lastPlayed: new Date(Date.now() - 13800000).toISOString() },

  // Punk / Pop Punk
  { id: 't026', title: 'Blitzkrieg Bop', artist: 'Ramones', album: 'Ramones', genre: 'Punk Rock', length: 142000, type: 'music', bpm: 173, year: 1976, isrc: 'USSM76000001', group: 'MUSIC', origin: 'cd', schedCodes: ['M', 'R'], playCount: 678, lastPlayed: new Date(Date.now() - 31200000).toISOString() },
  { id: 't027', title: 'American Idiot', artist: 'Green Day', album: 'American Idiot', genre: 'Punk Rock', length: 177000, type: 'music', bpm: 98, year: 2004, isrc: 'USWR04000001', group: 'MUSIC', origin: 'cd', schedCodes: ['M', 'R'], playCount: 1432, lastPlayed: new Date(Date.now() - 17400000).toISOString() },
  { id: 't028', title: 'Boulevard of Broken Dreams', artist: 'Green Day', album: 'American Idiot', genre: 'Punk Rock', length: 262000, type: 'music', bpm: 104, year: 2004, isrc: 'USWR04000002', group: 'MUSIC', origin: 'cd', schedCodes: ['M', 'R'], playCount: 1789, lastPlayed: new Date(Date.now() - 20200000).toISOString() },

  // Stadium Rock
  { id: 't029', title: 'Livin\' on a Prayer', artist: 'Bon Jovi', album: 'Slippery When Wet', genre: 'Classic Rock', length: 250000, type: 'music', bpm: 123, year: 1986, isrc: 'USPR86000001', group: 'MUSIC', origin: 'cd', schedCodes: ['M', 'R'], playCount: 2045, lastPlayed: new Date(Date.now() - 4400000).toISOString() },
  { id: 't030', title: 'It\'s My Life', artist: 'Bon Jovi', album: 'Crush', genre: 'Classic Rock', length: 224000, type: 'music', bpm: 120, year: 2000, isrc: 'USPR00000001', group: 'MUSIC', origin: 'cd', schedCodes: ['M', 'R'], playCount: 1234, lastPlayed: new Date(Date.now() - 16600000).toISOString() },

  // Jingles / Station IDs
  { id: 'j001', title: 'Station ID — Rock 88.7', artist: 'Station', album: 'Jingles', genre: 'Jingle', length: 8000, type: 'jingle', group: 'JINGLES', origin: 'en', schedCodes: ['J'], playCount: 9847 },
  { id: 'j002', title: 'Top of Hour Jingle', artist: 'Station', album: 'Jingles', genre: 'Jingle', length: 12000, type: 'jingle', group: 'JINGLES', origin: 'en', schedCodes: ['J'], playCount: 8234 },
  { id: 'j003', title: 'Weather Bed', artist: 'Station', album: 'Beds', genre: 'Bed', length: 30000, type: 'jingle', group: 'JINGLES', origin: 'en', schedCodes: ['B'], playCount: 3421 },
  { id: 'j004', title: 'News Intro', artist: 'Station', album: 'Beds', genre: 'Bed', length: 15000, type: 'jingle', group: 'JINGLES', origin: 'en', schedCodes: ['B'], playCount: 5678 },

  // Promos / PSAs
  { id: 'p001', title: 'Promo: Friday Night Rock Show', artist: 'Station', album: 'Promos', genre: 'Promo', length: 30000, type: 'promo', group: 'PROMOS', origin: 'en', schedCodes: ['P'], playCount: 234 },
  { id: 'p002', title: 'PSA: Community Notice', artist: 'Station', album: 'PSAs', genre: 'PSA', length: 45000, type: 'promo', group: 'PROMOS', origin: 'en', schedCodes: ['S'], playCount: 89 },

  // Ads
  { id: 'a001', title: 'Ad: Guitar Center', artist: 'Sponsor', album: 'Ads', genre: 'Advertisement', length: 30000, type: 'ad', group: 'ADS', origin: 'ftp', schedCodes: ['A'], playCount: 456 },
  { id: 'a002', title: 'Ad: Local Music Shop', artist: 'Sponsor', album: 'Ads', genre: 'Advertisement', length: 15000, type: 'ad', group: 'ADS', origin: 'ftp', schedCodes: ['A'], playCount: 312 },
]

// ============================================================================
// STATIONS
// ============================================================================

export const stations: Station[] = [
  { id: 'main-fm', name: 'Rock 88.7 FM', frequency: '88.7 FM', format: 'Classic & Modern Rock', onAir: true, listeners: 1287, streamUrl: 'http://stream.rock887.fm:8000/main.mp3', sampleRate: 48000 },
  { id: 'web-hd', name: 'Rock HD Stream', frequency: 'Web', format: 'High Quality Web Stream', onAir: true, listeners: 412, streamUrl: 'http://stream.rock887.fm:8000/hd.aac', sampleRate: 48000 },
  { id: 'mobile', name: 'Rock Mobile', frequency: 'Web', format: 'Low Bitrate Mobile', onAir: true, listeners: 89, streamUrl: 'http://stream.rock887.fm:8000/mobile.aac', sampleRate: 44100 },
]

// ============================================================================
// DAEMONS
// ============================================================================

export const daemons: Daemon[] = [
  { name: 'caed', status: 'running', cpuPercent: 8.4, memoryMb: 142, pid: 1024, uptime: 86420 },
  { name: 'ripcd', status: 'running', cpuPercent: 1.2, memoryMb: 38, pid: 1025, uptime: 86420 },
  { name: 'rdcatchd', status: 'running', cpuPercent: 0.4, memoryMb: 24, pid: 1026, uptime: 86420 },
  { name: 'rdpadengined', status: 'running', cpuPercent: 2.1, memoryMb: 56, pid: 1027, uptime: 86420 },
  { name: 'rdrepld', status: 'stopped', cpuPercent: 0, memoryMb: 0, pid: 0, uptime: 0 },
  { name: 'rdrssd', status: 'running', cpuPercent: 0.1, memoryMb: 12, pid: 1029, uptime: 86420 },
]

export const systemStatus: SystemStatus = {
  online: true,
  version: 'v4.4.1',
  schemaVersion: 377,
  uptime: 86420,
  activeStation: 'main-fm',
  tracks: rockTracks.length,
  stations: stations.length,
  daemonsRunning: daemons.filter((d) => d.status === 'running').length,
  daemonsTotal: daemons.length,
}

// ============================================================================
// SCHEDULE — today's shows (LibreTime split-layout pattern)
// ============================================================================

export const scheduleShows: ScheduleShow[] = [
  {
    id: 's1',
    name: 'Morning Drive',
    host: 'DJ Mike',
    startTime: '06:00',
    endTime: '10:00',
    dayOfWeek: new Date().getDay(),
    recurring: true,
    status: 'completed',
    logLines: [
      { line: 1, type: 'jingle', trackId: 'j001', title: 'Station ID — Rock 88.7', artist: 'Station', length: 8000, transition: 'play', status: 'played' },
      { line: 2, type: 'music', trackId: 't006', title: 'Don\'t Stop Believin\'', artist: 'Journey', length: 251000, transition: 'segue', status: 'played' },
      { line: 3, type: 'music', trackId: 't029', title: 'Livin\' on a Prayer', artist: 'Bon Jovi', length: 250000, transition: 'segue', status: 'played' },
      { line: 4, type: 'music', trackId: 't013', title: 'Smells Like Teen Spirit', artist: 'Nirvana', length: 301000, transition: 'segue', status: 'played' },
      { line: 5, type: 'jingle', trackId: 'j002', title: 'Top of Hour Jingle', artist: 'Station', length: 12000, transition: 'stop', status: 'played' },
    ],
  },
  {
    id: 's2',
    name: 'Midday Rock',
    host: 'DJ Sarah',
    startTime: '10:00',
    endTime: '14:00',
    dayOfWeek: new Date().getDay(),
    recurring: true,
    status: 'completed',
    logLines: [
      { line: 1, type: 'jingle', trackId: 'j001', title: 'Station ID — Rock 88.7', artist: 'Station', length: 8000, transition: 'play', status: 'played' },
      { line: 2, type: 'music', trackId: 't007', title: 'Sweet Child O\' Mine', artist: 'Guns N\' Roses', length: 356000, transition: 'segue', status: 'played' },
      { line: 3, type: 'music', trackId: 't004', title: 'Bohemian Rhapsody', artist: 'Queen', length: 354000, transition: 'segue', status: 'played' },
      { line: 4, type: 'music', trackId: 't020', title: 'The Pretender', artist: 'Foo Fighters', length: 269000, transition: 'segue', status: 'played' },
      { line: 5, type: 'ad', trackId: 'a001', title: 'Ad: Guitar Center', artist: 'Sponsor', length: 30000, transition: 'stop', status: 'played' },
      { line: 6, type: 'music', trackId: 't018', title: 'Seven Nation Army', artist: 'The White Stripes', length: 232000, transition: 'segue', status: 'played' },
    ],
  },
  {
    id: 's3',
    name: 'Afternoon Drive',
    host: 'DJ Alex',
    startTime: '14:00',
    endTime: '18:00',
    dayOfWeek: new Date().getDay(),
    recurring: true,
    status: 'live',
    logLines: [
      { line: 1, type: 'jingle', trackId: 'j001', title: 'Station ID — Rock 88.7', artist: 'Station', length: 8000, transition: 'play', status: 'played' },
      { line: 2, type: 'music', trackId: 't001', title: 'Back in Black', artist: 'AC/DC', length: 253000, transition: 'segue', status: 'played' },
      { line: 3, type: 'music', trackId: 't003', title: 'Thunderstruck', artist: 'AC/DC', length: 292000, transition: 'segue', status: 'playing' },
      { line: 4, type: 'music', trackId: 't021', title: 'Everlong', artist: 'Foo Fighters', length: 250000, transition: 'segue', status: 'scheduled' },
      { line: 5, type: 'jingle', trackId: 'j002', title: 'Top of Hour Jingle', artist: 'Station', length: 12000, transition: 'stop', status: 'scheduled' },
      { line: 6, type: 'music', trackId: 't024', title: 'In the End', artist: 'Linkin Park', length: 216000, transition: 'segue', status: 'scheduled' },
      { line: 7, type: 'music', trackId: 't005', title: 'We Will Rock You', artist: 'Queen', length: 122000, transition: 'segue', status: 'scheduled' },
      { line: 8, type: 'ad', trackId: 'a002', title: 'Ad: Local Music Shop', artist: 'Sponsor', length: 15000, transition: 'stop', status: 'scheduled' },
      { line: 9, type: 'music', trackId: 't015', title: 'Black Hole Sun', artist: 'Soundgarden', length: 320000, transition: 'segue', status: 'scheduled' },
      { line: 10, type: 'music', trackId: 't030', title: 'It\'s My Life', artist: 'Bon Jovi', length: 224000, transition: 'segue', status: 'scheduled' },
    ],
  },
  {
    id: 's4',
    name: 'Evening Rock',
    host: 'DJ Chris',
    startTime: '18:00',
    endTime: '22:00',
    dayOfWeek: new Date().getDay(),
    recurring: true,
    status: 'scheduled',
    logLines: [
      { line: 1, type: 'jingle', trackId: 'j001', title: 'Station ID — Rock 88.7', artist: 'Station', length: 8000, transition: 'play', status: 'scheduled' },
      { line: 2, type: 'music', trackId: 't009', title: 'Stairway to Heaven', artist: 'Led Zeppelin', length: 482000, transition: 'segue', status: 'scheduled' },
      { line: 3, type: 'music', trackId: 't017', title: 'Creep', artist: 'Radiohead', length: 238000, transition: 'segue', status: 'scheduled' },
      { line: 4, type: 'music', trackId: 't022', title: 'Hysteria', artist: 'Muse', length: 227000, transition: 'segue', status: 'scheduled' },
      { line: 5, type: 'music', trackId: 't028', title: 'Boulevard of Broken Dreams', artist: 'Green Day', length: 262000, transition: 'segue', status: 'scheduled' },
    ],
  },
  {
    id: 's5',
    name: 'Late Night Rock',
    host: 'Auto DJ',
    startTime: '22:00',
    endTime: '06:00',
    dayOfWeek: new Date().getDay(),
    recurring: true,
    status: 'scheduled',
    logLines: [
      { line: 1, type: 'jingle', trackId: 'j001', title: 'Station ID — Rock 88.7', artist: 'Station', length: 8000, transition: 'play', status: 'scheduled' },
      { line: 2, type: 'music', trackId: 't010', title: 'Whole Lotta Love', artist: 'Led Zeppelin', length: 334000, transition: 'segue', status: 'scheduled' },
      { line: 3, type: 'music', trackId: 't011', title: 'Smoke on the Water', artist: 'Deep Purple', length: 370000, transition: 'segue', status: 'scheduled' },
      { line: 4, type: 'music', trackId: 't012', title: 'Paranoid', artist: 'Black Sabbath', length: 171000, transition: 'segue', status: 'scheduled' },
      { line: 5, type: 'music', trackId: 't026', title: 'Blitzkrieg Bop', artist: 'Ramones', length: 142000, transition: 'segue', status: 'scheduled' },
    ],
  },
]
