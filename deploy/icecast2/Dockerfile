# ============================================================================
# Icecast2 Dockerfile — streaming server for Rock 88.7
#
# Builds a minimal Icecast2 image with the Rock 88.7 config.
# Listeners connect to http://host:8000/rock-887.mp3
# ============================================================================

FROM debian:bookworm-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends icecast2 && \
    rm -rf /var/lib/apt/lists/* && \
    mkdir -p /var/log/icecast2 && \
    chown icecast2:icecast /var/log/icecast2

COPY deploy/icecast2/icecast.xml /etc/icecast2/icecast.xml
RUN chown icecast2:icecast /etc/icecast2/icecast.xml

USER icecast2

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O- http://localhost:8000/status-json.xsl >/dev/null 2>&1 || exit 1

CMD ["icecast2", "-c", "/etc/icecast2/icecast.xml"]
