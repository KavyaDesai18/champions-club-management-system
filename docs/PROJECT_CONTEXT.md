# Champions Club — Project Context & System Architecture

## 1. Club Overview
**Champions Club** is a premier, multi-sport athletic club and community facility offering badminton courts, tennis courts, squash arenas, a pro shop, wellness facilities, and a club lounge/café. The platform powers end-to-end sports facility operations, member engagement, court reservations, food & beverage point-of-sale (POS), billing, and staff administration for hackathon showcase and enterprise club deployment.

---

## 2. User Roles & Access Control
The system enforces strict Role-Based Access Control (RBAC) across the following roles:

| Role | Responsibilities | Target Interface |
|---|---|---|
| **OWNER** | Ultimate administrative control, club financials, system configuration, member audit logs. | Staff Console (`/console`) |
| **MANAGER** | Day-to-day operations, staff scheduling, inventory pricing, override policies, analytics. | Staff Console (`/console`) |
| **FRONT_DESK** | Check-ins, walk-in court reservations, guest registrations, badge issuing, payment terminals. | Staff Console (`/console`) |
| **SHOP_STAFF** | Pro-shop merchandising, equipment rental management, racquet stringing orders. | Staff Console (`/console`) |
| **BAR_STAFF** | Club lounge & bar orders, tab management, drinks fulfillment, quick charge to member account. | Staff Console (`/console`) |
| **KITCHEN** | Kitchen Display System (KDS), preparation queues, food orders from lounge or courtside. | Staff Console (`/console`) |
| **COACH** | Training session schedules, private coaching booking management, student progress logs. | Staff Console (`/console`) & Member App (`/app`) |
| **MEMBER** | Court reservations, wallet top-up, membership renewals, event RSVP, order history, profile. | Member Portal (`/app`) |
| **GUEST** | Public court booking (walk-in rates), discovery, club tournament registration, guest passes. | Public Web (`/`) |

---

## 3. Technology Stack

### Backend
- **Language & Runtime:** Java 21 LTS
- **Framework:** Spring Boot 3.3.x
- **Build Tool:** Apache Maven
- **Persistence & ORM:** Spring Data JPA / Hibernate 6.x
- **Database:** PostgreSQL 16+ (Extensions: `btree_gist`, `pg_trgm`)
- **Database Migrations:** Flyway (`flyway-core`, `flyway-database-postgresql`)
- **Security & Tokens:** Spring Security 6.x, JJWT (`jjwt-api`, `jjwt-impl`, `jjwt-jackson`)
- **API Documentation:** SpringDoc OpenAPI v2 (`/swagger-ui/index.html`)
- **Observability:** Spring Boot Actuator (`/actuator/health`, `/actuator/info`, `/actuator/metrics`)
- **Testing:** JUnit 5, Mockito, AssertJ, Testcontainers PostgreSQL

### Frontend
- **Framework & Tooling:** React 18/19 + Vite 6
- **Routing:** React Router v6
- **Styling:** Tailwind CSS + Vanilla CSS Design Tokens
- **Icons:** Lucide React
- **State Management & Data Fetching:** TanStack Query v5 (React Query)
- **Forms & Validation:** React Hook Form + Zod
- **Animations:** Framer Motion
- **Data Visualization:** Recharts
- **HTTP Client:** Axios (Interceptors for Bearer JWT, refresh retry, and RFC7807 toast handling)
- **Testing:** Vitest, React Testing Library, Playwright (E2E)

---

## 4. Non-Negotiable Architectural Rules

1. **DB-Level Constraints Guard Double Booking**
   - Application-level pre-checks are convenient for UX, but **PostgreSQL exclusion constraints (`EXCLUDE USING gist`) or strict composite unique constraints** are the absolute, non-negotiable line of defense against race conditions and concurrent double bookings.
2. **Monetary Precision (BigDecimal / Minor Units)**
   - Float and double types are forbidden for financial transactions.
   - All amounts are represented as `java.math.BigDecimal` with scale 2 and `RoundingMode.HALF_UP` (or stored as minor integer units in cents/paise).
3. **UTC Instants & Club Timezone Boundary Computation**
   - Store all date-time values as UTC `Instant` (or `TIMESTAMPTZ` in PostgreSQL).
   - Compute day boundaries, operating hours, and daily reservation quotas strictly in the club's configured timezone (Default: `Asia/Kolkata`).
4. **Idempotency-Key on Mutating Endpoints**
   - All `POST`/`PUT` endpoints for payments, court reservations, wallet charges, and orders MUST accept an `Idempotency-Key` HTTP header. Duplicate requests with the same key must return the cached response without re-executing business logic.
5. **Flyway Migrations Exclusively (No ddl-auto)**
   - Hibernate schema auto-generation (`ddl-auto: update` or `create`) is forbidden in all environments. Hibernate runs in `validate` or `none` mode. Schema evolutions occur solely via versioned Flyway SQL scripts.
6. **Soft Deletes for Referenced Entities**
   - Data referenced by historical bookings, invoices, or audit records (e.g., members, courts, staff, products) must be soft-deleted (`is_deleted` flag and `deleted_at` timestamp) to preserve referential integrity.
7. **Every Module Ships With Comprehensive Tests**
   - Unit tests + Integration tests (running with Testcontainers PostgreSQL against real Flyway migrations) + Frontend component tests. No untested modules are merged.
8. **Audit Trail for Sensitive Operations**
   - Changes to user roles, refund transactions, court rate overrides, manual wallet credit adjustments, and booking cancellations must write an immutable entry to `audit_logs`.
9. **Premium UI/UX Standards**
   - Modern, dynamic, dark-mode first aesthetic with smooth Framer Motion micro-interactions, WCAG AA accessibility, keyboard navigation, and responsive skeleton loaders for all asynchronous data views.

---

## 5. Domain Business Rules & Policies

### Court Booking Rules
- **Session Duration:** Fixed 60-minute duration per session.
- **Slot Granularity:** Slots start every 30 minutes (e.g., 06:00, 06:30, 07:00, 07:30...).
- **Member Daily Quota:** Maximum **2 bookings per member per day** across all sports.
- **Operating Hours:** 06:00 AM to 11:00 PM (Club Timezone).
- **Advance Window:** Gold members can book 14 days in advance; Silver members 7 days; Guests / Walk-ins 48 hours.

### Membership Tiers
- **Gold Tier:**
  - Unlimited gym and social play access.
  - 14-day advance court booking privilege.
  - Member rate (25% discount) on court booking and pro-shop purchases.
  - 2 complimentary guest passes per month.
- **Silver Tier:**
  - Standard access to courts and fitness facilities.
  - 7-day advance booking window.
  - Standard member rates.
- **Junior Tier (<18 years old):**
  - Requires parental/guardian consent and linked primary contact.
  - Restricted hours (must conclude before 20:00 unless accompanied by coach or adult).
  - Discounted junior coaching rates.

### Social Play & Community
- **Friday Social Play:** Every Friday from 18:00 to 22:00, dedicated badminton & tennis courts are converted to round-robin open mixer sessions. Pre-registration is open to all active members without burning their standard daily booking quota.

### Pricing Structure
- **Members vs. Walk-In / Guest:**
  - Members book at subsidized plan rates or included tier allocations.
  - Walk-in / Guest bookings incur standard public peak/off-peak rates and require upfront digital payment before slot confirmation.
