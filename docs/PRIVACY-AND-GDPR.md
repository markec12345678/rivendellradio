# Privacy & GDPR Compliance — Listener Data

> *How Rock 88.7 handles listener IP addresses in compliance with GDPR and similar privacy regulations.*

---

## The design decision

Rock 88.7 needs to:
1. Count unique listeners
2. Detect returning listeners (return-rate analysis)
3. Correlate sessions across days for the same listener

These require a **persistent listener identifier**. But storing raw IP addresses is a privacy risk under GDPR (Article 4(1) — IP addresses are personal data).

### What we do

```
Raw IP → SHA-256(salt + ":" + ip) → 64-char hex hash → stored in listenerHash field
```

- The raw IP is **never** stored in the database
- A **salted** SHA-256 hash is stored instead
- The salt is read from the `LISTENER_HASH_SALT` environment variable
- The pipeline **refuses to persist** any session whose `listenerHash` is not a 64-char hex digest
- The salt should be **rotated quarterly** (see below)

### What this means

| Capability | With raw IP | With salted hash |
|-----------|-------------|------------------|
| Count unique listeners | ✅ | ✅ |
| Detect returning listener | ✅ | ✅ (until salt rotation) |
| Correlate sessions across days | ✅ | ✅ (until salt rotation) |
| Recover the original IP | ✅ | ❌ (not without the salt) |
| Track individual person | ✅ | ❌ (hash is pseudonymous, not identifying) |

---

## GDPR assessment

### Is the hash "personal data"?

Under GDPR Recital 26, pseudonymized data that can be attributed to a natural person by means of additional information (the salt) is still considered personal data.

**However:**
- The salt is stored **only** in the server environment, not in the database
- The salt is not accessible to anyone with database access alone
- The hash cannot be reversed without both the database AND the salt
- The purpose is **statistical analysis** (aggregate metrics), not individual tracking

This makes the hash **pseudonymous personal data** under GDPR Article 4(5), which qualifies for relaxed processing rules.

### Legal basis

| Processing purpose | Legal basis (GDPR) |
|-------------------|-------------------|
| Counting unique listeners | Legitimate interest (Art. 6(1)(f)) |
| Return-rate analysis | Legitimate interest (Art. 6(1)(f)) |
| Device segmentation | Legitimate interest (Art. 6(1)(f)) |
| Geographic region (coarse) | Legitimate interest (Art. 6(1)(f)) |

**Recommendation:** Include a privacy notice on the station's website stating that listener sessions are tracked in pseudonymous form for analytics purposes. Provide a contact method for data subject requests.

### Data subject rights

| Right | Feasibility |
|-------|-------------|
| Access (Art. 15) | Partial — the operator can look up sessions by hash, but cannot tell the user their hash without computing it from their current IP |
| Rectification (Art. 16) | N/A — listener data is factual, not correctable |
| Erasure (Art. 17) | ✅ — the operator can delete all sessions matching a specific hash. The user provides their IP, the operator hashes it with the current salt, and deletes matching rows |
| Portability (Art. 20) | ✅ — export sessions by hash |
| Objection (Art. 21) | ✅ — the listener can stop listening; no further data is collected |

### Salt rotation

The salt should be rotated quarterly to limit the linkability of hashes over time:

```bash
# Generate a new salt
NEW_SALT=$(openssl rand -hex 32)

# Update .env
sed -i "s/LISTENER_HASH_SALT=.*/LISTENER_HASH_SALT=$NEW_SALT/" .env

# Restart the app
docker compose -f docker-compose.production.yml restart web
```

**Effect of rotation:**
- Sessions collected before the rotation can no longer be correlated with sessions after the rotation
- Return-rate analysis resets at each rotation (by design)
- This is a feature, not a bug — it limits the long-term linkability of listener data

**Retention:**
- Listener sessions are retained indefinitely by default
- For GDPR compliance, consider a retention policy (e.g., delete sessions older than 2 years)
- Add a cron job: `DELETE FROM ListenerSession WHERE startedAt < date('now', '-2 years')`

---

## What we do NOT collect

- ❌ **Raw IP addresses** — never stored
- ❌ **Exact geolocation** — only coarse region (country/state level), derived from IP at ingestion
- ❌ **User accounts** — listeners do not log in; sessions are anonymous
- ❌ **Cookies** — the streaming protocol does not use cookies
- ❌ **Cross-site tracking** — no third-party analytics, no fingerprinting
- ❌ **Personal names** — listeners are never identified by name
- ❌ **Email addresses** — not collected

---

## Recommendations for deployment

1. **Privacy notice:** Add a `/privacy` page on the station website disclosing listener tracking
2. **Contact method:** Provide an email address for data subject requests
3. **Retention policy:** Delete sessions older than 2 years (or per local regulation)
4. **Salt rotation:** Quarterly, documented in the operator's runbook
5. **Access control:** The `LISTENER_HASH_SALT` env var must be restricted to the server environment — never committed to git, never logged
6. **Audit:** Log all queries that look up sessions by hash (for accountability)

---

## The honest tradeoff

We need session correlation for meaningful analytics (return rate, churn, daypart patterns). Without it, the AI cannot learn what keeps listeners engaged.

True anonymization (discarding IPs entirely) would prevent this analysis. Full identification (storing raw IPs) would violate privacy principles.

Salted hashing is the middle ground: enough correlation for analytics, enough protection for privacy. The salt rotation ensures this protection strengthens over time.

This tradeoff is documented here explicitly. It is not a hidden decision.
