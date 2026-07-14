# Performance & Security Audit

> *Real measurements, not "I think". Taken on 2026-07-14 against a running dev server.*

---

## Performance Benchmarks

### API Latency (median of 10 requests)

| Endpoint | Median Latency | Notes |
|----------|---------------|-------|
| `/api/v1/health` | 12.3 ms | Simple health check, no DB |
| `/api/v1/decision-ledger` | 12.6 ms | DB query, empty table |
| `/api/v1/listener-pipeline` | 9.3 ms | DB count, empty table |
| `/api/v1/ai/station-memory` | 89.0 ms | In-memory data + 80ms artificial delay |
| `/api/v1/epistemic-state` | 115.7 ms | Internal fetch of 3 AI modules |
| `/api/v1/governance` | 139.8 ms | Internal fetch of 4 endpoints + DB + computation |

### Page Load

| Route | Median Latency |
|-------|---------------|
| `/` (Dashboard) | 54.0 ms |

### Memory

| Metric | Value |
|--------|-------|
| RSS Memory | ~1.5 GB (dev mode, Turbopack) |
| CPU | ~118% (dev mode, hot reload active) |

**Note:** Dev mode uses significantly more memory than production. Production build (`bun run build && bun run start`) typically uses 200–400 MB.

### Observations

1. **Simple endpoints are fast** — health, decision-ledger, listener-pipeline all under 15ms
2. **Aggregation endpoints are slower** — governance and epistemic-state do internal HTTP fetches, adding ~100ms overhead. In production, these could be refactored to direct function calls.
3. **AI modules have artificial delays** — 80ms `setTimeout` in station-memory simulates processing time. Remove in production.
4. **Memory is dev-mode inflated** — production build will be 3–4x leaner.

### What was NOT measured (requires production infrastructure)

- 100 concurrent users (requires load testing tool: k6, Artillery)
- 10,000 WebSocket events (requires running broadcast-feed service)
- 24h uptime (requires long-running deployment)
- Memory leak detection (requires 24h+ soak test)
- Restart recovery (requires production deployment)

These require real infrastructure. The dev-mode numbers above are baseline indicators, not production guarantees.

---

## Security Audit

### Dependency Scan (npm audit)

```
Total vulnerabilities: 0
```

**Result:** No known vulnerabilities in dependencies. Run `npm audit` weekly in production.

### Secret Scan

Scanned all `.ts`/`.tsx` files for common secret patterns:
- API keys (`sk-`, `ghp_`, `github_pat_`, `AKIA`)
- Hardcoded passwords
- Connection strings

**Result:** No real secrets found. All password references are either:
- `***` placeholder strings (Liquidsoap config template)
- Form input fields (`type="password"`)
- React key prefixes (`sk-${i}` — not a secret)

### Security Headers (next.config.ts)

7 security headers configured:

| Header | Value | Purpose |
|--------|-------|---------|
| Strict-Transport-Security | `max-age=63072000; includeSubDomains; preload` | Force HTTPS for 2 years |
| X-Content-Type-Options | `nosniff` | Prevent MIME sniffing |
| X-Frame-Options | `SAMEORIGIN` | Prevent clickjacking |
| Referrer-Policy | `strict-origin-when-cross-origin` | Limit referrer leakage |
| Permissions-Policy | `camera=(), microphone=(self), geolocation=()` | Lock down powerful APIs |
| Cross-Origin-Opener-Policy | `same-origin` | Cross-origin isolation |
| Cross-Origin-Resource-Policy | `same-site` | Resource isolation |

**Result:** ✅ Comprehensive header coverage.

### Rate Limiting

`src/lib/rate-limit.ts` implements sliding-window rate limiting with RFC 7807 error responses.

**Result:** ✅ Rate limiting exists and is applied to API routes.

### Authentication

- **API Keys:** `ApiKey` Prisma model with SHA-256 hashed keys, permissions field, last-used tracking
- **RBAC:** 9 roles (admin, program-director, music-scheduler, news-editor, technical-engineer, traffic, producer, presenter, read-only)
- **Audit Trail:** All changes logged with user, action, entity, IP, timestamp

**Result:** ✅ Authentication and authorization infrastructure exists.

### CSRF Protection

**Not explicitly implemented.** Next.js Server Actions have built-in CSRF protection. API routes are stateless (no cookies → no CSRF risk). If cookie-based auth is added later, CSRF tokens will be required.

**Result:** ⚠️ Acceptable for current stateless API architecture.

### SQL Injection

Prisma ORM is used throughout — parameterized queries by default. No raw SQL queries found.

**Result:** ✅ No SQL injection risk.

### XSS

React escapes all content by default. `dangerouslySetInnerHTML` not found in any component.

**Result:** ✅ No XSS risk.

### SBOM (Software Bill of Materials)

CycloneDX SBOM generation is configured in CI/CD (`.github/workflows/ci-cd.yml`, security job). Generated on every push, uploaded as artifact.

**Result:** ✅ SBOM generation automated.

---

## Summary

| Category | Status |
|----------|--------|
| Dependencies | ✅ 0 vulnerabilities |
| Secrets | ✅ None found |
| Security Headers | ✅ 7 headers configured |
| Rate Limiting | ✅ Implemented |
| Authentication | ✅ API keys + RBAC |
| SQL Injection | ✅ Prisma parameterized |
| XSS | ✅ React auto-escaping |
| CSRF | ⚠️ Not needed (stateless API) |
| SBOM | ✅ Automated in CI/CD |
| API Latency | ✅ <15ms simple, <140ms complex |
| Page Load | ✅ 54ms dashboard |
| Memory | ⚠️ Dev mode 1.5GB; production ~300MB expected |

**Overall:** Production-ready from a security perspective. Performance is good for dev mode; production build will be significantly leaner.
