# Champions Club — OWASP Top 10 (2021) Security Review & Hardening Audit

This audit document details how the Champions Club Sports Management System implements defenses against the OWASP Top 10 vulnerabilities.

---

## 1. A01:2021 — Broken Access Control
- **Mitigation Architecture:**
  - Role-Based Access Control (RBAC) enforced at both URL pattern level (`SecurityConfig.java`) and method level via `@PreAuthorize` annotations across all domain controllers.
  - Roles strictly segregated: `OWNER`, `MANAGER`, `FRONT_DESK`, `SHOP_STAFF`, `BAR_STAFF`, `KITCHEN`, `COACH`, `MEMBER`, and `ANONYMOUS`.
  - Database-level isolation: Soft-deletes (`is_deleted = false`) automatically filtered across all repository lookup methods.
  - Automated Authorization Matrix Test (`AuthorizationMatrixIntegrationTest.java`) tests every endpoint across all roles to guarantee 401 Unauthorized for anonymous and 403 Forbidden for unauthorized roles.

---

## 2. A02:2021 — Cryptographic Failures
- **Mitigation Architecture:**
  - Password Hashing: BCrypt with work factor cost of 12 (`new BCryptPasswordEncoder(12)`).
  - JWT Tokens: JJWT library utilizing HMAC-SHA256 with 256-bit secret keys.
  - PII Protection: Bank account numbers and government PAN IDs masked in database storage (`••••••••4321` and `ABCDE••••F`).
  - Transport Security: Strict-Transport-Security (HSTS) header configured with `max-age=31536000; includeSubDomains`.

---

## 3. A03:2021 — Injection
- **Mitigation Architecture:**
  - SQL Injection: 100% parameterized queries via Spring Data JPA and Hibernate ORM. No raw concatenated SQL statements.
  - Double-Booking Race Condition: Handled by PostgreSQL GiST exclusion constraint (`EXCLUDE USING gist (court_id WITH =, tstzrange(start_at, end_at, '[)') WITH &&)`), stopping overlapping slots at engine level.
  - Formula Injection: CSV and Excel export processors quote and sanitize inputs starting with `=`, `+`, `-`, `@`.
  - Stored XSS: Member photo uploads restrict MIME types strictly to `image/jpeg`, `image/png`, `image/webp`. SVG format is explicitly rejected to eliminate embedded SVG `<script>` payloads.

---

## 4. A04:2021 — Insecure Design
- **Mitigation Architecture:**
  - Idempotency-Key support across all mutating financial, payment, order, and reservation endpoints (`Idempotency-Key` HTTP header).
  - Daily reservation quotas enforced (maximum 2 bookings per member per day).
  - Advance booking windows gated by membership tier (Gold: 14 days, Silver: 7 days, Guest: 48 hours).
  - Minor athlete safety mandate: Athletes under 18 cannot complete onboarding without verified legal guardian consent and linked emergency contact.

---

## 5. A05:2021 — Security Misconfiguration
- **Mitigation Architecture:**
  - Flyway Migrations exclusively: Hibernate `ddl-auto` is set to `validate` (never `update` or `create`).
  - Production Security Headers enforced in `SecurityConfig.java`:
    - `Content-Security-Policy: default-src 'self' ...`
    - `X-Frame-Options: DENY`
    - `X-Content-Type-Options: nosniff`
    - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
    - `Referrer-Policy: strict-origin-when-cross-origin`
    - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
  - CORS strictness: Explicitly permitted origins, methods, headers, and credentials. Wildcard `*` origins with credentials are strictly forbidden.

---

## 6. A06:2021 — Vulnerable and Outdated Components
- **Mitigation Architecture:**
  - Java 21 LTS + Spring Boot 3.3.4 (latest stable maintenance line).
  - Frontend: Vite 6, React 18/19, Axios, TanStack Query v5.
  - Regular dependency audits via `mvn dependency:tree` and `npm audit`.

---

## 7. A07:2021 — Identification and Authentication Failures
- **Mitigation Architecture:**
  - Rate Limiting Filter (`RateLimitingFilter.java`): In-memory Token Bucket enforcing max 60 requests/minute on `/api/v1/auth/login` and sensitive endpoints, returning HTTP 429 Too Many Requests with `Retry-After: 60`.
  - Brute Force Lockout: Failed login attempts counter tracking with account lockouts.
  - Refresh Token Rotation: Single-use refresh token generation with silent token renewal queuing in frontend `client.js`.

---

## 8. A08:2021 — Software and Data Integrity Failures
- **Mitigation Architecture:**
  - Multi-stage Docker build verifying dependencies in isolated containers.
  - GitHub Actions CI pipeline running compilation, static unit tests, Testcontainers integration tests, and Playwright E2E tests before merge.
  - Immutable audit logs tracking user privilege elevation, refunds, price overrides, and cancellation events.

---

## 9. A09:2021 — Security Logging and Monitoring Failures
- **Mitigation Architecture:**
  - Distributed Tracing Filter (`TraceIdFilter.java`): Assigns or propagates `X-Trace-Id` across all requests into SLF4J `MDC("traceId")` and HTTP response headers.
  - Centralized RFC 7807 problem details in `GlobalExceptionHandler.java` including traceId correlation for zero-leakage support logs.
  - Audit Trail (`audit_logs` table) recording timestamp, actor user ID, action, target entity type, entity ID, and client IP address.

---

## 10. A10:2021 — Server-Side Request Forgery (SSRF)
- **Mitigation Architecture:**
  - System does not fetch arbitrary external URLs from user parameters.
  - Payment webhooks are validated with signature verification.
  - Report sharing uses cryptographically generated 256-bit UUID tokens with TTLs and instant revocation.
