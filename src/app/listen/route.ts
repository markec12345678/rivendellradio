import { NextResponse } from 'next/server'

export const dynamic = 'force-static'

/**
 * /listen — minimal web player for Rock 88.7.
 *
 * Serves a standalone HTML page that listeners open in their browser.
 * The page connects directly to Icecast2 — no Rock 88.7 server load.
 *
 * The stream URL is configurable via ICECAST_PUBLIC_URL env var.
 * Default: http://SERVER_IP:8000/rock-887.mp3
 */

const ICECAST_PUBLIC_URL = process.env.ICECAST_PUBLIC_URL || ''

export async function GET() {
  const streamUrl = ICECAST_PUBLIC_URL || '/stream'

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Rock 88.7 FM — Listen Live</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0a0a;
      color: #fafafa;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }
    .player {
      text-align: center;
      max-width: 400px;
      width: 100%;
    }
    .logo {
      font-size: 2.5rem;
      font-weight: 800;
      letter-spacing: -0.05em;
      background: linear-gradient(135deg, #f59e0b, #f97316);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 0.5rem;
    }
    .tagline {
      color: #71717a;
      font-size: 0.875rem;
      margin-bottom: 2rem;
    }
    .play-button {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      border: 3px solid #f59e0b;
      background: transparent;
      color: #f59e0b;
      font-size: 3rem;
      cursor: pointer;
      transition: all 0.3s;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.5rem;
    }
    .play-button:hover {
      background: #f59e0b;
      color: #0a0a0a;
      transform: scale(1.05);
    }
    .play-button.playing {
      background: #f59e0b;
      color: #0a0a0a;
    }
    .status {
      font-size: 0.875rem;
      color: #71717a;
      margin-bottom: 2rem;
      min-height: 1.25rem;
    }
    .status.live { color: #22c55e; }
    .status.error { color: #ef4444; }
    .status.connecting { color: #f59e0b; }
    audio { display: none; }
    .footer {
      margin-top: 3rem;
      font-size: 0.75rem;
      color: #52525b;
    }
    .footer a { color: #71717a; text-decoration: none; }
    .footer a:hover { color: #f59e0b; }
  </style>
</head>
<body>
  <div class="player">
    <div class="logo">Rock 88.7</div>
    <div class="tagline">AI-driven rock radio</div>

    <button class="play-button" id="playBtn" onclick="togglePlay()">
      &#9654;
    </button>

    <div class="status" id="status">Click to listen live</div>

    <audio id="audio" preload="none"></audio>

    <div class="footer">
      <p>Powered by <a href="/">Rock 88.7 Control Center</a></p>
    </div>
  </div>

  <script>
    const audio = document.getElementById('audio');
    const playBtn = document.getElementById('playBtn');
    const status = document.getElementById('status');
    const streamUrl = '${streamUrl}';

    audio.src = streamUrl;

    function togglePlay() {
      if (audio.paused) {
        status.className = 'status connecting';
        status.textContent = 'Connecting...';
        audio.play().catch(err => {
          status.className = 'status error';
          status.textContent = 'Connection failed — stream may be offline';
          console.error('Playback error:', err);
        });
      } else {
        audio.pause();
        audio.src = '';
        status.className = 'status';
        status.textContent = 'Click to listen live';
        playBtn.innerHTML = '&#9654;';
        playBtn.classList.remove('playing');
        audio.src = streamUrl;
      }
    }

    audio.addEventListener('playing', () => {
      status.className = 'status live';
      status.textContent = '\\u25CF LIVE';
      playBtn.innerHTML = '&#10074;&#10074;';
      playBtn.classList.add('playing');
    });

    audio.addEventListener('error', () => {
      status.className = 'status error';
      status.textContent = 'Stream offline — please try again later';
      playBtn.innerHTML = '&#9654;';
      playBtn.classList.remove('playing');
    });

    audio.addEventListener('waiting', () => {
      status.className = 'status connecting';
      status.textContent = 'Buffering...';
    });
  </script>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
