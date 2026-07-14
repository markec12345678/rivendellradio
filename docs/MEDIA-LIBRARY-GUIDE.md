# Media Library Import Guide

> *How to get your MP3 collection into Rock 88.7 so Liquidsoap can play it.*

---

## Quick start

```bash
# 1. Put your MP3 files in a directory
mkdir -p /music/rock /music/jingles /music/ads
cp ~/Downloads/*.mp3 /music/rock/

# 2. Import them into Rock 88.7
curl -X POST http://localhost:3000/api/v1/media-library \
  -H 'Content-Type: application/json' \
  -d '{"directory": "/music/rock"}'

# 3. Verify
curl http://localhost:3000/api/v1/media-library | python3 -m json.tool | head -30
```

---

## What happens during import

For each audio file:

1. **Metadata extraction** — reads ID3v2 tags (title, artist, album, year, genre)
2. **Track creation** — if this title+artist doesn't exist yet, creates a Track
3. **Asset creation** — creates a MediaAsset linked to the Track
4. **Version detection** — detects if the file is a radio edit, clean edit, live version, etc.
5. **Dedup check** — if the same file (by path or content hash) already exists, updates it

### Example: importing 3 versions of the same song

```
/music/rock/
  queen-bohemian-rhapsody.mp3          (320k MP3, album version)
  queen-bohemian-rhapsody.flac         (FLAC, album version)
  queen-bohemian-rhapsody-radio.mp3    (192k MP3, radio edit 4:02)
```

After import:

```json
{
  "tracks": [
    {
      "title": "Bohemian Rhapsody",
      "artist": "Queen",
      "bpm": null,
      "category": null,
      "assets": [
        { "format": "flac", "version": "album", "bitrate": null },
        { "format": "mp3", "version": "album", "bitrate": 320 },
        { "format": "mp3", "version": "radio-edit", "bitrate": 192, "isRadioEdit": true }
      ]
    }
  ]
}
```

One Track, three Assets. The AI sees one song. Liquidsoap can choose the best format.

---

## File naming conventions

The version detector looks at the filename for common patterns:

| Filename pattern | Detected version | Flags |
|-----------------|-----------------|-------|
| `everlong.mp3` | `album` | — |
| `everlong-radio-edit.mp3` | `radio-edit` | `isRadioEdit: true` |
| `everlong-radio edit.mp3` | `radio-edit` | `isRadioEdit: true` |
| `everlong (radio).mp3` | `radio-edit` | `isRadioEdit: true` |
| `everlong-clean.mp3` | `clean-edit` | `isCleanEdit: true` |
| `everlong-live.mp3` | `live` | — |
| `everlong-acoustic.mp3` | `acoustic` | — |
| `everlong-extended.mp3` | `extended` | — |
| `everlong-remix.mp3` | `extended` | — |

If no pattern matches, the version defaults to `album`.

---

## Setting Track classification

After import, Tracks have no category or soundCode. Set them via the API:

```bash
# Set a Track as "power" category (high rotation)
curl -X PATCH http://localhost:3000/api/v1/media-library \
  -H 'Content-Type: application/json' \
  -d '{
    "trackId": "<track-id>",
    "category": "power",
    "soundCode": "A",
    "bpm": 158,
    "energy": 0.9
  }'
```

### Category system

| Category | Meaning | Rotation |
|----------|---------|----------|
| `power` | Current hits, highest rotation | Every 2-4 hours |
| `current` | New releases, moderate rotation | Every 4-6 hours |
| `recurrent` | Familiar hits from recent years | Every 8-12 hours |
| `gold` | Classics, lower rotation | Every 12-24 hours |
| `new` | Brand new, testing audience response | Special slots |

### Sound codes

| Code | Meaning |
|------|---------|
| `A` | High energy, upbeat |
| `B` | Medium energy |
| `C` | Low energy, slow |

---

## Generating a playlist for Liquidsoap

Liquidsoap reads from the Media Library API:

```
http://localhost:3000/api/v1/media-library?action=playlist&category=power&limit=50
```

This returns a JSON array of file paths. Liquidsoap's `playlist()` function can read this URL directly.

### Filtering options

| Parameter | Example | Effect |
|-----------|---------|--------|
| `category` | `category=power` | Only power-category tracks |
| `genre` | `genre=Rock` | Only Rock genre |
| `artist` | `artist=Foo` | Tracks by artists containing "Foo" |
| `limit` | `limit=50` | Maximum 50 tracks |

### Format preference

When a Track has multiple Assets (e.g., MP3 and FLAC), the playlist API automatically selects the best format:
1. FLAC (highest quality)
2. MP3 with highest bitrate
3. First available

---

## Directory structure recommendation

```
/music/
  /rock/           ← main music library
    foo-fighters-everlong.mp3
    acdc-thunderstruck.mp3
    queen-bohemian-rhapsody.mp3
    queen-bohemian-rhapsody-radio.mp3   ← radio edit, same Track
  /jingles/        ← station IDs, sweepers
    station-id-01.mp3
    top-of-hour.mp3
  /ads/            ← advertising
    guitar-shop.mp3
  /voice-tracks/   ← AI DJ voice links
    morning-intro.mp3
```

Import each directory:

```bash
curl -X POST http://localhost:3000/api/v1/media-library -H 'Content-Type: application/json' -d '{"directory": "/music/rock"}'
curl -X POST http://localhost:3000/api/v1/media-library -H 'Content-Type: application/json' -d '{"directory": "/music/jingles"}'
curl -X POST http://localhost:3000/api/v1/media-library -H 'Content-Type: application/json' -d '{"directory": "/music/ads"}'
```

---

## Re-importing (updates)

If you add new files to `/music/rock/`, just re-run the import:

```bash
curl -X POST http://localhost:3000/api/v1/media-library -H 'Content-Type: application/json' -d '{"directory": "/music/rock"}'
```

Existing files are updated (not duplicated). New files are imported. Files that no longer exist on disk remain in the database (use DELETE to remove them).

---

## What the AI sees

The AI Core and Scheduler query the Media Library — they never read files directly. This means:

- AI reasons about **Tracks** (musical properties, rotation history)
- AI does not know about **Assets** (file paths, formats) — that's Liquidsoap's concern
- The Scheduler picks a Track, the playlist API picks the best Asset for that Track
- Liquidsoap plays the file

This separation is deliberate: it prevents the AI from making decisions based on file format or path, and it allows the same Track to be played from different files depending on what's available.
