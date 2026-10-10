# Champions Club — Production Deployment & Operations Guide

This guide covers production deployment for the Champions Club Sports Management System across modern cloud infrastructure: **Neon Serverless PostgreSQL**, **Render / Railway** for the Spring Boot backend, and **Vercel / Netlify** for the React Vite frontend.

---

## 1. Cloud Architecture Overview

```
                        ┌─────────────────────────────────┐
                        │   Vercel / Netlify / Cloudflare │
                        │   React 18 + Vite SPA           │
                        └───────────────┬─────────────────┘
                                        │ HTTPS / WSS
                                        ▼
                        ┌─────────────────────────────────┐
                        │   Render / Railway / AWS ECS    │
                        │   Spring Boot 3.3 (Java 21 LTS) │
                        └───────────────┬─────────────────┘
                                        │ JDBC (HikariCP + TLS)
                                        ▼
                        ┌─────────────────────────────────┐
                        │   Neon Serverless PostgreSQL 16 │
                        │   (Flyway Migrations V1 - V15)  │
                        └─────────────────────────────────┘
```

---

## 2. Database Provisioning (Neon Serverless PostgreSQL)

1. Sign up / log in to [Neon Console](https://console.neon.tech).
2. Create a new project: `champions-club-prod`.
3. In SQL Editor, verify that the required PostgreSQL extensions can be created:
   ```sql
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   CREATE EXTENSION IF NOT EXISTS "pg_trgm";
   CREATE EXTENSION IF NOT EXISTS "citext";
   CREATE EXTENSION IF NOT EXISTS "btree_gist";
   ```
4. Copy the connection string (pooled connection recommended for web apps):
   ```
   postgres://[user]:[password]@[endpoint]-pooler.neon.tech/champions_club?sslmode=require
   ```
5. Format it for JDBC:
   ```
   jdbc:postgresql://[endpoint]-pooler.neon.tech/champions_club?sslmode=require
   ```

---

## 3. Backend Deployment (Render / Railway / Docker)

### Option A: Railway Deployment
1. Connect your GitHub repository to Railway.
2. Select `/backend` as the root directory.
3. Railway automatically detects the multi-stage `Dockerfile`.
4. Configure Environment Variables:
   | Variable | Description | Example / Recommended Value |
   |---|---|---|
   | `SPRING_PROFILES_ACTIVE` | Active profile | `prod` |
   | `SERVER_PORT` | HTTP server port | `8081` (or Railway `$PORT`) |
   | `DATABASE_URL` | Neon JDBC connection string | `jdbc:postgresql://ep-xyz.neon.tech/champions_club?sslmode=require` |
   | `DB_USER` | Neon database username | `champions_admin` |
   | `DB_PASSWORD` | Neon database password | `••••••••••••` |
   | `JWT_SECRET` | 256-bit cryptographically secure hex secret | `404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970` |
   | `CORS_ORIGINS` | Allowed frontend domains | `https://champions-club.vercel.app,http://localhost:5173` |
   | `CLUB_TIMEZONE` | Primary operating timezone | `Asia/Kolkata` |
   | `MEMBERSHIP_GRACE_PERIOD_DAYS` | Grace days after expiration | `0` |
   | `HIKARI_MAX_POOL_SIZE` | Maximum connection pool size | `10` |
   | `HIKARI_MIN_IDLE` | Minimum idle pool connections | `2` |

5. Deploy. Flyway will automatically run all migrations (`V1` through `V15`) on startup before accepting incoming traffic.
6. Verify Health Check:
   ```bash
   curl -i https://[backend-domain]/actuator/health
   # Expected: {"status":"UP","components":{"db":{"status":"UP"},"diskSpace":{"status":"UP"},"ping":{"status":"UP"}}}
   ```

### Option B: Render Deployment
1. Create a new **Web Service** pointing to your repository.
2. Root Directory: `backend`.
3. Runtime: **Docker**.
4. Health Check Path: `/actuator/health`.
5. Set the identical environment variables as listed above.

---

## 4. Frontend Deployment (Vercel / Netlify)

### Vercel Deployment
1. In Vercel, Import project and select the `frontend` folder as the Root Directory.
2. Build Settings:
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm ci`
3. Environment Variables:
   | Variable | Description | Example Value |
   |---|---|---|
   | `VITE_API_URL` | Base URL of deployed Spring Boot backend | `https://api.championsclub.example.com/api/v1` |
4. Rewrites Configuration (`vercel.json`):
   ```json
   {
     "rewrites": [
       { "source": "/(.*)", "destination": "/index.html" }
     ]
   }
   ```
5. Deploy. Public pages and lazy routes will automatically be distributed to global Edge CDNs.

---

## 5. Zero-Downtime Database Migration & Rollback Strategy

1. **Non-Destructive Schema Evolution Rule:**
   - Column additions, table creations, and index creations MUST always be additive (`ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`).
   - Renames and column drops MUST follow the Expand-Contract pattern across two release cycles:
     1. Cycle 1: Add new column, dual-write in application, backfill data.
     2. Cycle 2: Switch reads to new column, drop legacy column in future Flyway migration.
2. **Rollback Strategy:**
   - Backend containers can be instantly rolled back to the previous immutable Docker tag on Render/Railway.
   - Schema rollbacks: Flyway migrations are version-locked. Never execute `DROP TABLE` in production during incident recovery; use compensation migrations (`V16__revert_...sql`).
   - Neon Branching: Before major schema upgrades, create an instant copy-on-write branch in Neon for non-destructive dry-run testing.
