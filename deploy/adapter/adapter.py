#!/usr/bin/env python3
"""
Rock 88.7 — Icecast2 Listener Adapter

Polls Icecast2 /status-json.xsl every 60 seconds, detects new/disconnected
listeners, hashes their IPs, and POSTs sessions to Rock 88.7's listener
pipeline.

This is the bridge between Icecast2 and Rock 88.7's governance layer.

Quick start:
  1. pip install requests
  2. Set environment variables (see below)
  3. python3 adapter.py

Environment variables:
  ICECAST_URL     — http://stream.rock887.fm:8000
  ICECAST_MOUNT   — /rock-887.mp3
  ROCK887_URL     — http://localhost:3000
  LISTENER_HASH_SALT — must match Rock 88.7's .env
  POLL_INTERVAL   — seconds between polls (default: 60)
"""

import os
import sys
import time
import json
import hashlib
import requests
from datetime import datetime, timezone

# Configuration
ICECAST_URL = os.getenv('ICECAST_URL', 'http://localhost:8000')
ICECAST_MOUNT = os.getenv('ICECAST_MOUNT', '/rock-887.mp3')
ROCK887_URL = os.getenv('ROCK887_URL', 'http://localhost:3000')
HASH_SALT = os.getenv('LISTENER_HASH_SALT', '')
POLL_INTERVAL = int(os.getenv('POLL_INTERVAL', '60'))

if not HASH_SALT:
    print('ERROR: LISTENER_HASH_SALT not set. The pipeline refuses unhashed IPs.')
    sys.exit(1)

# Track known listeners: { listener_id: { ip, user_agent, connected_since, mount } }
known_listeners = {}


def hash_ip(ip: str) -> str:
    """Hash an IP address with salt for pseudonymous storage."""
    data = (HASH_SALT + ':' + ip).encode()
    return hashlib.sha256(data).hexdigest()


def fetch_icecast_status() -> dict:
    """Fetch listener list from Icecast2."""
    try:
        resp = requests.get(f'{ICECAST_URL}/status-json.xsl', timeout=10)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        print(f'[{datetime.now()}] Error fetching Icecast2 status: {e}')
        return {}


def parse_listeners(status: dict) -> list:
    """Extract listeners for our mount from Icecast2 status."""
    listeners = []
    icestats = status.get('icestats', {})

    sources = icestats.get('source', [])
    if isinstance(sources, dict):
        sources = [sources]

    for source in sources:
        if source.get('listenurl', '').endswith(ICECAST_MOUNT):
            listener_list = source.get('listeners_list', [])
            for listener in listener_list:
                listeners.append({
                    'id': listener.get('id'),
                    'ip': listener.get('ip'),
                    'user_agent': listener.get('user_agent', ''),
                    'connected': listener.get('connected', 0),
                    'referer': listener.get('referer', ''),
                })

    return listeners


def infer_session(listener: dict, now: datetime) -> dict:
    """Infer session start/end times from Icecast2 listener data."""
    connected_secs = listener.get('connected', 0)
    started_at = datetime.fromtimestamp(
        now.timestamp() - connected_secs, tz=timezone.utc
    ).isoformat()

    return {
        'startedAt': started_at,
        'endedAt': now.isoformat(),
        'mount': ICECAST_MOUNT,
        'listenerHash': hash_ip(listener['ip']),
        'userAgent': listener.get('user_agent', ''),
        'referer': listener.get('referer') or None,
    }


def post_session_to_rock887(session: dict):
    """POST a listener session to Rock 88.7's pipeline."""
    try:
        resp = requests.post(
            f'{ROCK887_URL}/api/v1/listener-pipeline',
            json={
                'source': ICECAST_URL,
                'fetchedAt': session['endedAt'],
                'sessions': [session],
            },
            timeout=10,
        )
        data = resp.json()
        if data.get('firstRealSession'):
            print(f'[{datetime.now()}] *** FIRST REAL SESSION INGESTED ***')
            print(f'  The system has transitioned from simulated to observed.')
            print(f'  Write the first entry in docs/STATION-CHRONICLE.md now.')
        return data
    except Exception as e:
        print(f'[{datetime.now()}] Error posting to Rock 88.7: {e}')
        return None


def main():
    print(f'[{datetime.now()}] Rock 88.7 Icecast2 Adapter starting...')
    print(f'  Icecast2: {ICECAST_URL}')
    print(f'  Mount: {ICECAST_MOUNT}')
    print(f'  Rock 88.7: {ROCK887_URL}')
    print(f'  Poll interval: {POLL_INTERVAL}s')
    print()

    while True:
        now = datetime.now(timezone.utc)

        # Fetch current listeners
        status = fetch_icecast_status()
        current_listeners = parse_listeners(status)

        current_ids = {l['id'] for l in current_listeners}

        # Detect disconnections: listeners we knew about but are gone now
        for lid, listener_data in list(known_listeners.items()):
            if lid not in current_ids:
                # Listener disconnected — POST their session
                session = infer_session(listener_data, now)
                print(f'[{now}] Listener {lid} disconnected — posting session')
                post_session_to_rock887(session)
                del known_listeners[lid]

        # Update known listeners
        for listener in current_listeners:
            lid = listener['id']
            if lid not in known_listeners:
                print(f'[{now}] New listener {lid} from {listener["ip"]}')
            known_listeners[lid] = listener

        # Status
        active = len(known_listeners)
        if active > 0:
            print(f'[{now}] Active listeners: {active}')

        time.sleep(POLL_INTERVAL)


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print('\n[{}] Adapter stopped.'.format(datetime.now()))
