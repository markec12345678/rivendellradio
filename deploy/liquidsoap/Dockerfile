# ============================================================================
# Liquidsoap Dockerfile — audio playout engine for Rock 88.7
#
# Builds a Liquidsoap image that reads playlists from Rock 88.7's Media
# Library API and streams to Icecast2.
# ============================================================================

FROM debian:bookworm-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends liquidsoap && \
    rm -rf /var/lib/apt/lists/* && \
    mkdir -p /music /var/log/liquidsoap

COPY deploy/liquidsoap/radio.liq /etc/liquidsoap/radio.liq

# Music volume — mount your MP3 directory here
VOLUME ["/music"]

EXPOSE 8010

HEALTHCHECK --interval=60s --timeout=10s --start-period=30s --retries=3 \
  CMD pgrep -x liquidsoap >/dev/null || exit 1

CMD ["liquidsoap", "/etc/liquidsoap/radio.liq"]
