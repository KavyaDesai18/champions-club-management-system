# Known Limitations & Production Boundaries
**Champions Club Management System — Technical & Operational Disclosures**

This document provides a transparent, honest assessment of system boundaries, simulated subsystems, and architectural scope for the Champions Club platform as of v1.0.0.

---

### 1. External Third-Party Communication Integrations
- **Simulated WhatsApp & SMS Gateways:** 
  - WhatsApp Business Cloud API and Twilio SMS notification dispatchers operate with structured logging, webhook simulations, and internal event auditing.
  - In a live production deployment, API keys, WhatsApp approved HSM templates, and registered DLT sender IDs (for Indian carrier regulations) must be configured in environment variables.

### 2. Payment Gateway Sandbox & Tokenization
- **Gateway Simulation:**
  - Razorpay and Stripe gateway interactions (credit cards, UPI QR dynamic intent, net banking) are implemented with standard webhook signature validation (`X-Razorpay-Signature`, HMAC-SHA256).
  - For staging and testing, transactions occur against sandbox mocks and internal wallet ledger balances. Direct merchant bank settlement requires production gateway credentials (`RAZORPAY_KEY_SECRET`, `STRIPE_WEBHOOK_SECRET`).

### 3. Single-Venue Domain Architecture
- **Venue Scope:**
  - The domain model is optimized specifically for a premier multi-sport racquet club (badminton, squash, tennis, pickleball) with integrated front desk, pro shop, lounge/bar, and payroll facilities.
  - Multi-tenant enterprise capabilities (e.g., cross-franchise multi-city venue switching and aggregated multi-club holding company consolidation) are intentionally deferred to future versions.

### 4. Real-Time Client Synchronization
- **Polling vs. Persistent WebSockets:**
  - Real-time court availability, kitchen order tickets (KOT), and bar tab states utilize reactive TanStack Query polling intervals with optimistic updates and distributed Postgres GiST exclusion locks.
  - While this design guarantees 100% double-booking prevention at the database level, ultra-high-frequency KOT displays would benefit from dedicated WebSocket / SSE streaming under high concurrent kitchen loads (>50 orders/minute).

### 5. Offline Queue Scope
- **Browser-Level Offline Resilience:**
  - The application features an automatic offline banner, Axios network retry with exponential backoff, and state preservation across temporary network drops.
  - Full offline-first point-of-sale functionality (e.g., ringing bar orders during an extended 4-hour internet outage) requires browser IndexedDB queueing with Service Worker background synchronization.

### 6. Hardware Turnstile & Biometric Integration
- **Gate Controller Protocol:**
  - Turnstile barcode/RFID badge validation is implemented via high-speed RESTful QR verification endpoints (`/api/v1/members/verify-badge/{memberNo}`).
  - Physical turnstile relays requiring RS-485 serial communication, Wiegand interfaces, or proprietary OEM Windows DLL drivers require an on-premise edge gateway daemon.

### 7. File Upload Storage
- **Local / Ephemeral Storage vs Object Store:**
  - Member profile avatars and medical waiver uploads default to local filesystem or base64 storage.
  - For serverless or multi-container horizontal scale (Render, Railway, ECS), an S3-compatible object store (AWS S3, Cloudflare R2, Supabase Storage) should be plugged into the storage interface.
