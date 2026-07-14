#!/usr/bin/liquidsoap
# ============================================================================
# Rock 88.7 — Liquidsoap Production Config
#
# This is the audio playback engine. Rock 88.7 does NOT play audio itself —
# it tells Liquidsoap WHAT to play via the Media Library API.
#
# Architecture:
#   Rock 88.7 Media Library API → playlist → Liquidsoap → Icecast2 → Listeners
#
# Quick start:
#   1. Install: sudo apt install liquidsoap icecast2
#   2. Copy this file: sudo cp radio.liq /etc/liquidsoap/radio.liq
#   3. Edit Icecast2 password below
#   4. Start: sudo systemctl start liquidsoap
#
# See: docs/INSTALL-IN-15-MINUTES.md
# ============================================================================

# --- Configuration ---
set("log.file.path", "/var/log/liquidsoap/radio.log")
set("log.level", 3)

# Icecast2 connection
ICECAST_HOST = "localhost"
ICECAST_PORT = 8000
ICECAST_PASSWORD = "hackme"  # CHANGE THIS — must match icecast.xml
ICECAST_MOUNT = "/rock-887.mp3"

# Media Library — Rock 88.7 tells us what to play
# This endpoint returns a list of file paths
MEDIA_LIBRARY_URL = "http://localhost:3000/api/v1/media-library?action=playlist&limit=100"

# --- Sources ---

# Main music playlist — fetched from Rock 88.7 Media Library
# Liquidsoap will re-fetch the playlist every 300 seconds (5 min)
music = playlist(
  mode="random",
  reload=300,
  MEDIA_LIBRARY_URL
)

# Jingles (every 4 tracks)
jingles = playlist(mode="random", "/music/jingles/")

# Station IDs (every 30 minutes)
station_ids = playlist(mode="random", "/music/station-ids/")

# --- Processing ---

# Rotate: 4 music tracks, 1 jingle
radio = rotate(weights=[4,1], [music, jingles])

# Insert station ID every 30 minutes
radio = rotate(weights=[1,1], [
  radio,
  delay(1800., station_ids)
])

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

# Log that we're live
log("Rock 88.7 — streaming to #{ICECAST_HOST}:#{ICECAST_PORT}#{ICECAST_MOUNT}")
