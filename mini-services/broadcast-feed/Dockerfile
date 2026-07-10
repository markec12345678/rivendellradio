# ============================================================================
# Dockerfile — broadcast-feed WebSocket mini-service
# Real-time telemetry: VU meters, now-playing, listeners, daemon load
# ============================================================================

FROM oven/bun:1.1-slim

WORKDIR /app

# Copy package files
COPY mini-services/broadcast-feed/package.json ./
COPY mini-services/broadcast-feed/index.ts ./

# Install dependencies
RUN bun install

# Create non-root user
RUN addgroup --system --gid 1001 bunjs && \
    adduser --system --uid 1001 bunjs

USER bunjs

EXPOSE 3003

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun -e "fetch('http://localhost:3003/socket.io/?EIO=4&transport=polling').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

CMD ["bun", "index.ts"]
