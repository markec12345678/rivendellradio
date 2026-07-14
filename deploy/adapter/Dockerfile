# ============================================================================
# Icecast2 Listener Adapter Dockerfile
#
# Polls Icecast2 /status-json.xsl, detects listener disconnections,
# hashes IPs, and POSTs sessions to Rock 88.7's listener pipeline.
# ============================================================================

FROM python:3.12-slim

RUN pip install --no-cache-dir requests

COPY deploy/adapter/adapter.py /app/adapter.py

WORKDIR /app

CMD ["python3", "adapter.py"]
