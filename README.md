# Endpoint Monitor

A full-stack uptime monitoring app. Users register endpoints (URL + method + expected status + interval), and a background worker pings them on schedule, tracks response times and availability, opens/resolves incidents automatically, and sends email alerts when an endpoint goes down or recovers.

## Tech stack

**Backend**
- Node.js + TypeScript + Express
- PostgreSQL via Prisma ORM
- Redis + BullMQ for scheduled HTTP checks
- JWT auth with refresh-token rotation (bcrypt-hashed passwords, SHA-256 refresh tokens)
- Zod for request validation
- `express-rate-limit` on auth endpoints
- Resend for transactional email (optional — no-op when unconfigured)

**Frontend**
- Vite + React 18 + TypeScript
- Tailwind CSS
- React Router v6
- TanStack Query for server state and polling
- Axios with auto-refresh interceptor
- Inline SVG for the response-time sparkline (no chart library)

**Infra**
- Docker Compose for Postgres 16 and Redis 7
- API and worker run as separate Node processes

## Architecture

```
                ┌──────────────────┐
                │   Browser (SPA)  │
                │  React + Vite    │
                └────────┬─────────┘
                         │ HTTPS (JWT)
                         ▼
┌────────────────────────────────────────────────┐
│              Express API (port 4000)           │
│  ┌──────────┐  ┌────────────┐  ┌────────────┐  │
│  │  /auth   │  │ /monitors  │  │  /health   │  │
│  └──────────┘  └──────┬─────┘  └────────────┘  │
└─────────┬─────────────┼───────────────┬────────┘
          │             │               │
          │  Prisma     │  BullMQ       │
          ▼             ▼               ▼
   ┌───────────┐  ┌──────────┐   ┌──────────────┐
   │ Postgres  │  │  Redis   │   │    Resend    │
   │           │  │ (queues) │   │ (email API)  │
   └───────────┘  └─────┬────┘   └──────┬───────┘
                        │               ▲
                        ▼               │
                ┌──────────────────┐    │
                │  Worker process  │────┘
                │  (BullMQ worker) │
                └────────┬─────────┘
                         │ fetch() w/ AbortController
                         ▼
                ┌──────────────────┐
                │  User endpoints  │
                │  (the internet)  │
                └──────────────────┘
```

**Request flow — creating a monitor:**
1. Browser POSTs to `/api/monitors` with the monitor config.
2. API validates with Zod, inserts into Postgres, and calls `scheduleMonitor(id, intervalSeconds)`.
3. Scheduler registers a BullMQ repeatable job (`jobId: monitor:<id>`) plus a one-off "initial" job so the first check fires within seconds.
4. Worker picks up the job, runs `fetch()` against the target URL with a timeout, and writes a `Check` row. If the state flipped (UP↔DOWN), it opens or resolves an `Incident` in the same transaction and then sends an email (outside the transaction so external API calls don't hold row locks).

**Auth flow:**
- `/auth/register` + `/auth/login` return `{ accessToken, refreshToken }`.
- Access token lives 15m; refresh token is stored hashed (SHA-256) in Postgres with an expiry.
- Axios interceptor catches 401s, calls `/auth/refresh` with the stored refresh token, retries the original request. Concurrent 401s share a single in-flight refresh via a Promise lock.
- Refresh is rotated on every use (old row revoked, new row issued).

**Rate limits (per IP):**
- `POST /auth/login` — 10 / 15 min
- `POST /auth/register` — 5 / hour
- `POST /auth/refresh` — 60 / 15 min

## Quickstart

### 1. Prerequisites
- Node.js 20+
- Docker Desktop (for Postgres + Redis)

### 2. Start infrastructure

```bash
docker compose up -d
```

Postgres on `localhost:5432`, Redis on `localhost:6379`. Data persists in named volumes.

### 3. Backend

```bash
cd backend
cp .env.example .env
# edit .env — at minimum set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET (32+ chars each).
# generate via: openssl rand -base64 48
npm install
npm run prisma:generate
npm run prisma:migrate   # first run creates the schema
```

Run the API and worker in two terminals:

```bash
npm run dev           # API on :4000
npm run dev:worker    # BullMQ worker
```

### 4. Frontend

```bash
cd frontend
npm install
npm run dev           # Vite on :3000, proxies /api → :4000
```

Open `http://localhost:3000`, register an account, and create a monitor. The first check lands within a few seconds.

### 5. Email alerts (optional)

Leave `RESEND_API_KEY` blank and notifications become no-ops (logged, not sent). To enable:

```bash
RESEND_API_KEY=re_...
EMAIL_FROM=alerts@yourdomain.com
```

## Environment variables

| Variable | Required | Default | Notes |
|---|---|---|---|
| `DATABASE_URL` | yes | — | Postgres connection string |
| `REDIS_URL` | yes | — | e.g. `redis://localhost:6379` |
| `JWT_ACCESS_SECRET` | yes | — | 32+ chars |
| `JWT_REFRESH_SECRET` | yes | — | 32+ chars, distinct from access |
| `JWT_ACCESS_EXPIRES_IN` | no | `15m` | `jsonwebtoken` duration string |
| `JWT_REFRESH_EXPIRES_IN` | no | `7d` | |
| `API_PORT` | no | `4000` | |
| `CORS_ORIGIN` | no | `http://localhost:3000` | Frontend origin |
| `RESEND_API_KEY` | no | — | Omit to disable email |
| `EMAIL_FROM` | no | — | Required if `RESEND_API_KEY` is set |
| `NODE_ENV` | no | `development` | |

## Project structure

```
.
├── backend
│   ├── prisma/schema.prisma       # User, Monitor, Check, Incident, RefreshToken
│   └── src
│       ├── index.ts               # API entrypoint
│       ├── worker.ts              # Worker entrypoint (separate process)
│       ├── app.ts                 # Express app wiring
│       ├── jobs
│       │   ├── queue.ts           # BullMQ queue + events
│       │   ├── scheduler.ts       # schedule/unschedule + reschedule-all on boot
│       │   ├── checker.ts         # perform HTTP check + update DB + incidents
│       │   └── worker.ts          # BullMQ Worker factory
│       ├── lib
│       │   ├── prisma.ts
│       │   ├── redis.ts
│       │   ├── env.ts             # Zod-validated env
│       │   ├── auth.ts            # JWT + bcrypt helpers
│       │   ├── notifications.ts   # Resend wrappers (no-op if unset)
│       │   └── logger.ts
│       ├── middleware/auth.ts     # authRequired
│       ├── routes
│       │   ├── auth.ts            # register/login/refresh/logout/me + rate limits
│       │   └── monitors.ts        # CRUD + /stats endpoint
│       └── schemas                # Zod DTOs
│
├── frontend
│   └── src
│       ├── App.tsx                # Router + providers
│       ├── lib
│       │   ├── api.ts             # Axios w/ refresh interceptor
│       │   ├── auth.tsx           # AuthProvider + context
│       │   ├── queryClient.ts
│       │   └── tokens.ts          # localStorage wrappers
│       ├── components
│       │   ├── Layout.tsx
│       │   ├── ProtectedRoute.tsx
│       │   ├── StatusBadge.tsx
│       │   ├── StatCard.tsx 
│       │   └── Sparkline.tsx      # inline SVG, handles null gaps + failure dots
│       └── pages
│           ├── LoginPage.tsx
│           ├── RegisterPage.tsx
│           ├── DashboardPage.tsx      # monitor list, poll every 15s
│           └── MonitorDetailPage.tsx  # KPIs + sparkline + recent checks + incidents
│
└── docker-compose.yml             # Postgres 16 + Redis 7
```

## Design notes

- **Separate worker process.** The API and worker share a codebase but run as distinct processes. Either can scale independently, and a slow HTTP check can't starve the API event loop.
- **Self-healing schedule.** On boot, `rescheduleAllMonitors()` reads all enabled monitors from Postgres and re-registers their repeatable jobs. Wiping Redis is non-destructive.
- **Atomic incident bookkeeping.** The `Check` insert, `Monitor` status update, and `Incident` open/close happen in a single `prisma.$transaction`. Email sends run afterward so a flaky SMTP provider can't hold row locks or block the next check.
- **Authorization by ownership.** Every monitor query is scoped with `where: { userId }` — a user can't fetch another user's monitor even by guessing its id.
- **No chart library.** The response-time sparkline is a hand-rolled SVG polyline with gap handling for null (failed) checks and red dots on failures. Zero dependencies, no bundle bloat.
