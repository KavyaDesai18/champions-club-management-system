# Contributing to Champions Club

Thank you for contributing to **Champions Club Sports Club Management System**!

## Git Workflow & Branching Strategy
- **`main`**: Production-ready, protected branch. Always green and passing CI.
- **`develop`**: Integration branch for upcoming releases and hackathon deliverables.
- **`feature/<module>`**: Feature branches branched from `develop` (e.g., `feature/court-booking`, `feature/pos-bar`).
- **`bugfix/<issue>`**: Bug fix branches.

## Commit Message Guidelines
We strictly enforce **Conventional Commits**:
- `feat(<module>): add court reservation validation`
- `fix(<module>): handle race condition on booking slot constraint`
- `docs(<module>): update architecture diagram and API spec`
- `style(<module>): format code style and lint rules`
- `refactor(<module>): restructure idempotency filter`
- `test(<module>): add testcontainers integration tests for flyway schema`
- `chore: update dependencies and build scripts`

## Non-Negotiable Engineering Rules
1. **Database Constraints**: Double booking prevention must be backed by database exclusion/unique constraints, not just app-level checks.
2. **Monetary Precision**: Never use floating point numbers. Use `BigDecimal` with scale 2 (`RoundingMode.HALF_UP`) or minor integer units (cents/paise).
3. **Time Handling**: Store UTC `Instant` in the database. Compute local day/slot boundaries using the configured club timezone (`Asia/Kolkata`).
4. **Idempotency**: All mutating operations (`POST`, `PUT`) on payments, bookings, and orders must accept and validate an `Idempotency-Key` header.
5. **Database Migrations**: Rely solely on Flyway migrations. Never enable Hibernate auto DDL schema generation (`ddl-auto: validate` or `none`).
6. **Soft Deletes**: Entities referenced across records must utilize soft deletion (`is_deleted` / `deleted_at`).
7. **Comprehensive Testing**: Every backend module must include unit tests and Testcontainers integration tests. Every frontend feature must include component tests.
8. **Audit Trail**: Sensitive actions (role changes, payment status updates, manual refunds) must write to the audit log.
9. **UI & UX Quality**: Dark mode first, animated transitions with Framer Motion, WCAG accessible, skeleton loading states.

## Getting Started
1. Backend: Java 21, Spring Boot 3.x, Maven.
2. Frontend: React 19 / Vite, Tailwind CSS, Lucide React, TanStack Query, React Hook Form, Zod.
3. Database: PostgreSQL 16+ with `btree_gist` and `pg_trgm` extensions enabled.
