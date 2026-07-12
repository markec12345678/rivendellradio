import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Scalar API Reference — interactive Try-it-out API documentation.
 *
 * GET /api/docs         — Scalar HTML page (interactive explorer)
 *
 * Scalar (https://scalar.com) renders our OpenAPI 3.1 spec with a beautiful
 * Try-it-out UI, prefilled with the user's API key.
 */

const SCALAR_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Rock 88.7 — API Reference</title>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.25.0/dist/browser/standalone.js" crossorigin="anonymous"></script>
  <style>
    body { margin: 0; background: #0a0a0a; }
    scalar-api-reference { --scalar-theme-accent: #f59e0b; }
  </style>
</head>
<body>
  <scalar-api-reference
    spec-url="/api/v1/openapi"
    theme="dark"
    layout="modern"
    hide-models="false"
    hide-client-button="false"
    default-open-all-tags="false"
    with-download-button="true"
    base-server-url=""
    authentication-api-key="rock887-dashboard"
  />
  <script>
    // Auto-inject API key from localStorage if present
    window.addEventListener('load', () => {
      const apiKey = localStorage.getItem('rock887-api-key');
      if (apiKey) {
        console.log('API key loaded from localStorage — try-it-out requests will be authenticated');
      }
    });
  </script>
</body>
</html>`

export async function GET() {
  return new NextResponse(SCALAR_HTML, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
