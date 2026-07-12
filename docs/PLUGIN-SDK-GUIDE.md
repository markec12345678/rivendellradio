# Rock 88.7 — Plugin SDK Guide

## Overview

The Plugin SDK allows third-party developers to extend the Rock 88.7 platform with custom modules: event handlers, API endpoints, UI panels, and broadcast integrations.

## Quick Start

```bash
# Create a new plugin
bun create @rock887/plugin my-plugin

cd my-plugin
bun install
bun dev  # Hot reload plugin development
```

## Plugin Structure

```
my-plugin/
├── package.json          # @rock887/plugin- prefix required
├── manifest.json         # Plugin manifest (permissions, handlers, UI)
├── src/
│   ├── index.ts          # Entry point (default export)
│   ├── handlers/         # Event handlers
│   └── components/       # UI panel components (React)
├── tests/
│   └── plugin.test.ts    # Plugin tests (run in sandbox)
└── README.md
```

## Manifest

```json
{
  "apiVersion": "1.0.0",
  "name": "my-plugin",
  "version": "1.0.0",
  "author": "Your Name",
  "description": "My custom plugin",
  "permissions": ["event:read", "event:write", "ui:panel"],
  "eventHandlers": [
    { "event": "track.started", "handler": "onTrackStarted" }
  ],
  "apiEndpoints": [
    { "path": "/my-plugin/stats", "method": "GET", "handler": "getStats" }
  ],
  "uiPanels": [
    { "id": "my-panel", "title": "My Plugin", "tab": "reports", "component": "MyPanel" }
  ],
  "configSchema": {
    "apiKey": "string",
    "enabled": "boolean"
  }
}
```

## Permissions

| Permission | Description |
|---|---|
| `event:read` | Subscribe to Event Bus events |
| `event:write` | Publish events to Event Bus |
| `playout:control` | Control playout (play/stop/segue) |
| `schedule:write` | Modify schedule + music log |
| `rds:write` | Write to RDS encoder |
| `dab:write` | Write to DAB+ slideshow/DLS |
| `ui:panel` | Register UI panel in dashboard |
| `api:expose` | Expose new API endpoints |
| `db:read` | Read from database (sandboxed schema) |
| `db:write` | Write to database (sandboxed schema) |

## Example Plugin

```typescript
import { Plugin } from '@rock887/plugin-sdk'

export default class MyPlugin extends Plugin {
  // Called when plugin is enabled
  onEnable() {
    this.log('MyPlugin enabled')
  }

  // Event handler (registered in manifest)
  onTrackStarted(event: { trackId: string; title: string; artist: string }) {
    this.log(`Track started: ${event.title} by ${event.artist}`)

    // Publish a custom event
    this.publish('my-plugin.track-analyzed', {
      trackId: event.trackId,
      analysis: { bpm: 120, key: '5A' },
    })
  }

  // API endpoint handler (registered in manifest)
  async getStats(req: Request): Promise<Response> {
    return Response.json({ tracksAnalyzed: 847 })
  }

  // UI panel component (registered in manifest)
  // Must be a React component exported from src/components/MyPanel.tsx
}
```

## Sandbox

Plugins run in a VM2 sandbox with:
- **CPU limit**: 100ms per event handler
- **Memory limit**: 128MB per plugin
- **Network**: Configurable allowlist per plugin
- **File system**: Read-only except plugin's own directory

## Testing

```bash
# Run plugin tests in sandbox
bun test

# Test against mock Event Bus
bun test --mock-eventbus
```

## Publishing

```bash
# Sign plugin with PGP key
rock887 sign --key ~/.pgp/my-plugin.key

# Publish to registry
rock887 publish

# Plugin enters review (automated checks + manual review for paid/hardware)
# Review time: 2-5 business days
```

## Marketplace

Published plugins appear at `https://registry.rock887.fm/plugins` with:
- Download count + weekly trend
- User ratings + reviews
- PGP signature + SHA-256 checksum verification
- Auto-update (stable/beta/canary channels)
- Revenue sharing (10-20% platform fee for paid plugins)

## Categories

| Category | Description |
|---|---|
| integration | External service integrations (Spotify, social, analytics) |
| ui | Custom dashboard panels + visualizations |
| scheduling | Music rotation rules, clock types, scheduling algorithms |
| playout | Playout control, cart types, voice processors |
| analytics | Listener analytics, reporting, metrics |
| social | Social media automation, posting, engagement |
| hardware | Hardware bridges (SNMP, GPIO, transmitter control) |
| ai | AI-powered features (voice enhancement, metadata, etc.) |
