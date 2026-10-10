# 🏆 Champions Club — Sports Club Management System

[![CI Pipeline](https://github.com/KavyaDesai18/champions-club-management-system/actions/workflows/ci.yml/badge.svg)](https://github.com/KavyaDesai18/champions-club-management-system/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Java 21](https://img.shields.io/badge/Java-21-orange.svg)](https://openjdk.org/projects/jdk/21/)
[![Spring Boot 3.3](https://img.shields.io/badge/Spring_Boot-3.3-green.svg)](https://spring.io/projects/spring-boot)
[![Vite + React](https://img.shields.io/badge/React-19-cyan.svg)](https://react.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8.svg)](https://tailwindcss.com)

**Champions Club** is an enterprise-grade, high-performance Sports Club Management System engineered for sports clubs, athletic centers, and multi-sport complexes. The system seamlessly unifies court reservations, membership tier management, pro-shop inventory, food & beverage point-of-sale, coaching sessions, and financial auditing into a real-time, responsive platform.

---

## 🏛 System Architecture

```mermaid
flowchart TD
    subgraph Clients["Frontend Clients (React 19 + Vite)"]
        PublicApp["Public Web Portal (/)<br/>• Discovery & Guest Booking"]
        MemberApp["Member Portal (/app)<br/>• 60m Slots, Wallet, Tier Perks"]
        StaffConsole["Staff Console (/console)<br/>• Front Desk, KDS, Bar, POS, Ops"]
    end

    subgraph GatewaySec["Security & Routing Layer"]
        AxiosClient["Axios Interceptors<br/>• Bearer JWT<br/>• Idempotency-Key<br/>• Trace ID Header<br/>• RFC 7807 Error Handler"]
        SpringSec["Spring Security 6.x Filter Chain<br/>• JJWT Validator<br/>• Rate Limiting Filter<br/>• Distributed TraceIdFilter<br/>• Auditing"]
    end

    subgraph Backend["Spring Boot 3.x Backend (Modular Monolith)"]
        CoreAPI["REST APIs (/api/v1) & OpenAPI Docs (/swagger-ui)"]
        
        subgraph Modules["Domain Modules"]
            CourtMod["Court Booking Service<br/>• 60-min slots / 30-min start<br/>• Max 2 bookings/day quota<br/>• GiST Exclusion Guard"]
            MemberMod["Membership Service<br/>• Gold / Silver / Junior tiers<br/>• Wallet & Guest passes<br/>• Age-gated Guardian consents"]
            POSMod["POS, Bar & Kitchen Service<br/>• F&B Orders & Pro-Shop<br/>• Kitchen Display System<br/>• Tab Splitting Engine"]
            OpsMod["HR & Facility Service<br/>• Roster Shifts & Overtime<br/>• Monthly Payroll Run<br/>• Racket Stringing Tickets"]
            AuditMod["Audit & Billing Service<br/>• Immutable Audit Log<br/>• Minor units / BigDecimal"]
        end
        
        CommonLayer["Common Utilities<br/>• Injected Clock Bean<br/>• Money Helper (scale 2, HALF_UP)<br/>• RFC7807 Global Exception Handler"]
    end

    subgraph Database["Data Layer (PostgreSQL 16+ / Neon)"]
        Flyway["Flyway Migration Engine<br/>• V1 to V15 migrations (btree_gist, pg_trgm)"]
        DBStore[("PostgreSQL Database<br/>• GiST Exclusion Constraints<br/>• Performance Composite Indexes<br/>• Soft Deletes & Audit Trails")]
    end

    Clients --> AxiosClient
    AxiosClient --> SpringSec
    SpringSec --> CoreAPI
    CoreAPI --> Modules
    Modules --> CommonLayer
    Modules --> Flyway
    Flyway --> DBStore
    Modules --> DBStore
```

---

## 📸 System Previews & UI Highlights

| Scene & Module | Interface Preview | Operational Description |
| :--- | :--- | :--- |
| **Front Desk Member Wizard** | `[ 📸 Screenshot: Front Desk Athlete Onboarding ]` | Multi-step registration wizard with automated DOB age calculation, Junior guardian mandate, plan selection, and instant QR badge generation. |
| **Court Grid & Concurrency** | `[ 📸 Screenshot: 6pm Peak Court Reservation Matrix ]` | Real-time multi-court matrix enforcing 60-min slots, 30-min start intervals, peak surge pricing, and PostgreSQL GiST exclusion double-booking defense. |
| **Lounge & Bar POS** | `[ 📸 Screenshot: Bar POS, Tabs & Split Settlement ]` | Quick-touch bar point-of-sale supporting multi-member tab accumulation, table transfers, KDS routing, and equal/custom split bill settlements. |
| **Pro Shop & Racket Service** | `[ 📸 Screenshot: Pro Shop Catalog & Stringing Tickets ]` | SKU inventory matrix with variant tracking (sizes/colors), low-stock thresholds, and racket stringing intake with tension specs and technician tracking. |
| **Executive Financials** | `[ 📸 Screenshot: Owner Month-End Revenue Analytics ]` | Financial health dashboard tracking revenue by revenue center (Courts, Bar, Shop, Memberships), receivables ledger, and monthly payroll execution. |

---

## 🧬 Entity-Relationship (ER) Architecture

```mermaid
erDiagram
    USERS ||--o| MEMBERS : "authenticates"
    USERS ||--o| EMPLOYEES : "links staff identity"
    MEMBERSHIP_PLANS ||--o{ MEMBERS : "subscribes"
    
    MEMBERS ||--o{ BOOKINGS : "reserves"
    COURTS ||--o{ BOOKINGS : "hosts"
    
    MEMBERS ||--o{ SERVICE_TICKETS : "requests stringing"
    MEMBERS ||--o{ SHOP_ORDERS : "purchases"
    SHOP_PRODUCTS ||--o{ SHOP_VARIANTS : "has variants"
    SHOP_VARIANTS ||--o{ SHOP_ORDER_ITEMS : "ordered"
    SHOP_ORDERS ||--o{ SHOP_ORDER_ITEMS : "contains"
    
    MEMBERS ||--o{ BAR_TABS : "opens tab"
    BAR_TABS ||--o{ BAR_TAB_ITEMS : "orders"
    BAR_TABS ||--o{ BAR_PAYMENTS : "settles"
    
    EMPLOYEES ||--o{ ROSTER_SHIFTS : "scheduled"
    EMPLOYEES ||--o{ PAYSLIPS : "paid via"
    PAYROLL_RUNS ||--o{ PAYSLIPS : "generates"
    
    USERS ||--o{ AUDIT_LOGS : "triggers actor actions"

    USERS {
        uuid id PK
        string email UK
        string password_hash
        string role "ADMIN, FRONT_DESK, BAR_STAFF, COACH, MEMBER"
        boolean active
        timestamp created_at
    }

    MEMBERS {
        uuid id PK
        string member_no UK "e.g. CC-000101"
        string full_name
        string email
        string phone UK
        date dob
        string status "ACTIVE, EXPIRED, SUSPENDED"
        uuid plan_id FK
        date start_date
        date end_date
        bigint wallet_balance_paise
        string guardian_name "nullable"
        string guardian_phone "nullable"
    }

    MEMBERSHIP_PLANS {
        string code PK "GOLD, SILVER, JUNIOR"
        string name
        bigint annual_price_paise
        int max_active_bookings
        int guest_passes_included
        boolean court_peak_privileges
    }

    COURTS {
        uuid id PK
        string name "Court 1 to Court 6"
        string sport_type "BADMINTON, SQUASH, TENNIS, PICKLEBALL"
        string surface_type "SYNTHETIC_MAT, WOODEN, ACRYLIC"
        boolean indoor
        boolean lighting_active
        boolean active
    }

    BOOKINGS {
        uuid id PK
        uuid court_id FK
        uuid member_id FK
        tstzrange booking_range "EXCLUDE WITH gist"
        string status "CONFIRMED, CANCELLED, COMPLETED"
        bigint total_amount_paise
        string idempotency_key UK
        timestamp created_at
    }

    BAR_TABS {
        uuid id PK
        uuid primary_member_id FK
        string table_number
        string status "OPEN, CLOSED, SPLIT"
        bigint subtotal_paise
        bigint tax_paise
        bigint tip_paise
        bigint total_paise
    }

    SERVICE_TICKETS {
        uuid id PK
        uuid member_id FK
        string ticket_no UK
        string racket_brand
        string string_type
        decimal main_tension_lbs
        decimal cross_tension_lbs
        string status "RECEIVED, IN_PROGRESS, READY, DELIVERED"
        bigint cost_paise
    }

    AUDIT_LOGS {
        uuid id PK
        string trace_id
        uuid actor_id FK
        string action "e.g. BOOKING_CREATED, TAB_SPLIT"
        string entity_name
        string entity_id
        string ip_address
        timestamp timestamp
    }
```

---

## 📚 Key Technical Documentation

- 📖 **[5-Minute Judging Demo Script](docs/DEMO_SCRIPT.md):** Complete click-by-click runbook covering all 7 core operational scenarios.
- 🛡 **[OWASP Top 10 Security Audit](docs/OWASP_TOP_10_SECURITY_AUDIT.md):** Production hardening audit (SQLi, IDOR, SSRF, security headers, rate limiting, and RBAC matrix).
- 🚀 **[Production Deployment Guide](docs/DEPLOYMENT_GUIDE.md):** Multi-stage Docker instructions, cloud deploy setup (Render, Railway, Vercel, Neon), and rollback procedures.
- 🔍 **[Known Limitations & Boundaries](docs/KNOWN_LIMITATIONS.md):** Transparent disclosure of mock gateways, offline boundaries, and hardware integrations.
- 📑 **Interactive OpenAPI Documentation:** Accessible at `http://localhost:8081/swagger-ui/index.html` or `/v3/api-docs` when running the backend.

---

## ⚡ Realistic Demo Seeding

To quickly populate an empty development or staging database with a vibrant, living sports club:

```bash
# Option 1: Trigger via REST endpoint (Development / Staging)
curl -X POST http://localhost:8081/api/v1/public/demo/seed

# Option 2: Run via Backend Spring Boot CLI arg
java -jar target/champions-club-backend-1.0.0-SNAPSHOT.jar --seed-demo
```

**Seed Dataset Includes:**
- **3 Membership Plans:** Gold VIP, Silver Club, Junior Cadet
- **6 Sports Courts:** Badminton (Courts 1–2), Squash (Courts 3–4), Tennis (Court 5), Pickleball (Court 6)
- **60 Realistic Members:** 25 Gold, 25 Silver, 10 Junior Cadets with verified Guardian consent; 5 expiring within 7 days, 3 expired
- **3 Weeks of Bookings:** Historical completed matches, peak 18:00 slots, and future reservations
- **Friday Social Mixer:** Recurring group club night with 12 registered members
- **Pro Shop Catalog:** 4 products (Yonex racquets, Nike shoes, shuttlecock tubes, overgrips) with variant matrix and low-stock alerts
- **Racket Stringing Ticket:** In-progress Yonex Astrox restringing job at 26x28 lbs
- **Lounge Bar POS:** Active open table tabs, kitchen order prep tickets, and split bills
- **Staff, Roster & Payroll:** 4 employees across departments, 14 roster shifts, and previous month payroll with generated payslips

---

## 🚀 Key Non-Negotiable Rules

1. **Database-Level Double Booking Guard:** PostgreSQL GiST exclusion constraints are the final, authoritative defense against concurrent court booking race conditions.
2. **Monetary Safety:** All currency calculations strictly use `BigDecimal` with 2 decimal places and `HALF_UP` rounding (or minor units). No `float` or `double`.
3. **UTC Time Persistence:** Stored as UTC `Instant`; day boundaries computed in club timezone (`Asia/Kolkata`).
4. **Idempotency Headers:** Mutating payments, bookings, and orders require an `Idempotency-Key` header to prevent duplicate execution.
5. **Strict Flyway Migrations:** Hibernate `ddl-auto` is disabled (`validate`/`none`). All schema changes are versioned via Flyway.
6. **Soft Deletion:** Referenced operational records maintain referential integrity via soft deletes.
7. **Comprehensive Test Suite:** Every module includes unit tests, Testcontainers PostgreSQL integration tests, and frontend test coverage.

---

## 📁 Repository Structure

```
champions-club-management-system/
├── backend/                       # Spring Boot 3.x Backend (Java 21, Maven)
│   ├── src/main/java/com/championsclub/
│   │   ├── common/                # Security, RFC7807 Error handling, Audit, Money, Time, Idempotency
│   │   ├── court/                 # Court booking module (api, service, domain, repo, dto)
│   │   ├── member/                # Membership and tier module
│   │   └── pos/                   # Point-of-Sale, Bar & Kitchen module
│   ├── src/main/resources/
│   │   ├── db/migration/          # Flyway migration scripts (V1__init.sql)
│   │   ├── application.yml        # Base configuration
│   │   ├── application-dev.yml    # Dev profile
│   │   ├── application-test.yml   # Test profile (Testcontainers)
│   │   └── application-prod.yml   # Prod profile (Neon SSL support)
│   └── src/test/java/             # Unit and Testcontainers smoke tests
├── frontend/                      # React 19 + Vite SPA
│   ├── src/
│   │   ├── api/                   # Axios client with auth interceptor & RFC 7807 parser
│   │   ├── components/            # Reusable UI components & layouts
│   │   ├── pages/
│   │   │   ├── public/            # Public discovery & guest booking (/)
│   │   │   ├── member/            # Member dashboard & bookings (/app)
│   │   │   └── staff/             # Staff operations & KDS (/console)
│   │   └── test/                  # Vitest and RTL component tests
├── docs/                          # Architectural context and specs
│   └── PROJECT_CONTEXT.md         # Full club context and business rules
└── .github/                       # CI workflows, PR and issue templates
```

---

## 🛠 Local Setup & Running

### Prerequisites
- **Java 21 LTS**
- **Maven 3.9+** (or included `mvnw`)
- **Node.js 20+** and **npm**
- **Docker** (for Testcontainers during integration tests)

### 1. Backend

```bash
cd backend
# Copy environment file
cp .env.example .env

# Run all tests (including Flyway + Testcontainers integration tests)
mvn clean test

# Run application locally
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```
- Health Check: `http://localhost:8081/actuator/health`
- OpenAPI Swagger UI: `http://localhost:8081/swagger-ui/index.html`

### 2. Frontend

```bash
cd frontend
# Install dependencies
npm install

# Run unit tests
npm run test:run

# Run development server
npm run dev
```
- Local URL: `http://localhost:5173`
- Public Portal: `http://localhost:5173/`
- Member App: `http://localhost:5173/app`
- Staff Console: `http://localhost:5173/console`

---

## 🧪 Testing Suite

- **Backend Unit & Integration Tests:**
  ```bash
  cd backend && mvn test
  ```
- **Frontend Vitest Tests:**
  ```bash
  cd frontend && npm run test:run
  ```
- **Frontend Production Build:**
  ```bash
  cd frontend && npm run build
  ```

---

## 📄 License
This project is licensed under the [MIT License](LICENSE).
