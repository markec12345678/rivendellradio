#!/usr/bin/liquidsoap
# ============================================================================
# Rock 88.7 — Liquidsoap Live Broadcast Config
#
# Supports BOTH:
#   1. Auto-Pilot mode (AI-generated playlists)
#   2. Live broadcast mode (DJ connects via Icecast2 source client)
#
# When a live source connects, Liquidsoap switches from auto-pilot to live.
# When the live source disconnects, Liquidsoap falls back to auto-pilot.
#
# This closes the "live broadcast" gap from the weakness analysis — for free.
#
# Quick start:
#   1. Start this Liquidsoap config:
#      liquidsoap deploy/liquidsoap/radio-live.liq
#
#   2. Auto-pilot plays AI-generated shows
#
#   3. To go LIVE: connect an Icecast2 source client to port 8010
#      (e.g., BUTT, Mixxx, or OBS)
#      Server: localhost, Port: 8010, Password: livepass
#
#   4. When the live source disconnects, auto-pilot resumes automatically
# ============================================================================

set("log.file.path", "/var/log/liquidsoap/radio-live.log")
set("log.level", 3)

# --- Configuration ---
def env_or(default, var) =
  if getenv(var) != "" then getenv(var) else default end
end

ICECAST_HOST = env_or("localhost", "ICECAST_HOST")
ICECAST_PORT = int_of_string(env_or("8000", "ICECAST_PORT"))
ICECAST_PASSWORD = env_or("hackme", "ICECAST_PASSWORD")
ICECAST_MOUNT = "/rock-887.mp3"

# Live source (DJ connects here)
LIVE_PORT = int_of_string(env_or("8010", "LIVE_PORT"))
LIVE_PASSWORD = env_or("livepass", "LIVE_PASSWORD")

# AI-generated playlist
PLAYLIST_PATH = env_or("./playlists/current.m3u", "PLAYLIST_PATH")

# --- Sources ---

# 1. Live source (highest priority — when a DJ connects, they take over)
live = input.harbor(
  port=LIVE_PORT,
  password=LIVE_PASSWORD,
  mount="/live",
  on_connect=lambda(_) -> log("LIVE: DJ connected — switching to live broadcast"),
  on_disconnect=lambda() -> log("LIVE: DJ disconnected — returning to auto-pilot")
)

# 2. AI-generated playlist (auto-pilot mode)
ai_playlist = playlist(
  mode="normal",
  reload=60,
  PLAYLIST_PATH
)

# 3. Fallback: random music from Media Library
fallback_playlist = playlist(
  mode="random",
  reload=300,
  "http://localhost:3000/api/v1/media-library?action=playlist&limit=50"
)

# --- Processing ---

# Priority: live > AI playlist > random fallback
radio = fallback([
  live,             # If a DJ is connected, use their stream
  ai_playlist,      # Otherwise, play AI-generated show
  fallback_playlist # Last resort: random music
])

# Normalize loudness (EBU R128 target: -23 LUFS)
radio = normalize(target=-23., radio)

# Crossfade between tracks (not during live)
radio = crossfade(smart=true, radio)

# --- Output ---

output.icecast(
  %mp3(bitrate=192, samplerate=44100, stereo=true),
  host=ICECAST_HOST,
  port=ICECAST_PORT,
  password=ICECAST_PASSWORD,
  mount=ICECAST_MOUNT,
  name="Rock 88.7 FM — AI + Live",
  description="AI-driven rock radio with live broadcast support",
  genre="Rock",
  url="http://rock887.fm",
  radio
)

log("Rock 88.7 — Live + Auto-Pilot mode")
log("  Auto-pilot: #{PLAYLIST_PATH}")
log("  Live source: port #{LIVE_PORT} (password: #{LIVE_PASSWORD})")
log("  Stream: #{ICECAST_HOST}:#{ICECAST_PORT}#{ICECAST_MOUNT}")
log("")
log("  To go LIVE: connect an Icecast2 source client to port #{LIVE_PORT}")
log("  (e.g., BUTT, Mixxx, OBS — Server: localhost, Port: #{LIVE_PORT}, Password: #{LIVE_PASSWORD})")
log("  When the DJ disconnects, auto-pilot resumes automatically.")
