#!/usr/bin/liquidsoap
# ============================================================================
# Rock 88.7 — Liquidsoap Production Config (Docker-aware)
#
# Reads playlist from Rock 88.7 Media Library API, streams to Icecast2.
#
# Environment variables (set in docker-compose):
#   ROCK887_URL     — http://web:3000 (Rock 88.7 API)
#   ICECAST_HOST    — icecast (Icecast2 hostname)
#   ICECAST_PORT    — 8000
#   ICECAST_PASSWORD — hackme (must match icecast.xml)
# ============================================================================

set("log.file.path", "/var/log/liquidsoap/radio.log")
set("log.level", 3)

# --- Configuration (from environment) ---
def env_or(default, var) =
  if getenv(var) != "" then getenv(var) else default end
end

ROCK887_URL = env_or("http://localhost:3000", "ROCK887_URL")
ICECAST_HOST = env_or("localhost", "ICECAST_HOST")
ICECAST_PORT = int_of_string(env_or("8000", "ICECAST_PORT"))
ICECAST_PASSWORD = env_or("hackme", "ICECAST_PASSWORD")
ICECAST_MOUNT = "/rock-887.mp3"

MEDIA_LIBRARY_URL = "#{ROCK887_URL}/api/v1/media-library?action=playlist&limit=100"

# --- Sources ---

# Main music playlist — fetched from Rock 88.7 Media Library
# Liquidsoap will re-fetch the playlist every 300 seconds (5 min)
music = playlist(
  mode="random",
  reload=300,
  MEDIA_LIBRARY_URL
)

# Jingles (every 4 tracks) — from local directory
jingles = playlist(mode="random", "/music/jingles/")

# --- Processing ---

# Rotate: 4 music tracks, 1 jingle
radio = rotate(weights=[4,1], [music, jingles])

# Normalize loudness (EBU R128 target: -23 LUFS)
radio = normalize(target=-23., radio)

# Crossfade between tracks (3 second crossfade)
radio = crossfade(smart=true, radio)

# --- Output ---

# Stream to Icecast2
output.icecast(
  %mp3(bitrate=192, samplerate=44100, stereo=true),
  host=ICECAST_HOST,
  port=ICECAST_PORT,
  password=ICECAST_PASSWORD,
  mount=ICECAST_MOUNT,
  name="Rock 88.7 FM",
  description="AI-driven rock radio",
  genre="Rock",
  url="http://rock887.fm",
  radio
)

log("Rock 88.7 — streaming to #{ICECAST_HOST}:#{ICECAST_PORT}#{ICECAST_MOUNT}")
log("  Playlist source: #{MEDIA_LIBRARY_URL}")
