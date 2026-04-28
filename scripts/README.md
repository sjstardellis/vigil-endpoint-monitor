# scripts/

Bash scripts that wrap the dev workflow. All scripts:
- Live in this folder and resolve paths relative to the repo root, so you can
  run them from anywhere (`./scripts/dev.sh`, `bash scripts/dev.sh`, etc.).
- Use `set -euo pipefail` so any error aborts immediately.
- Print colored status lines (`→`, `✓`, `!`, `✗`).
- Share helpers via `_lib.sh` (sourced, never executed directly).

## Prerequisites

- **Node 20+** and **npm**
- **Docker Desktop** (running) — provides Postgres + Redis
- **Bash** — Git Bash on Windows is fine; macOS/Linux native bash works too

## First time

```bash
chmod +x scripts/*.sh    # one-time, makes the scripts executable
./scripts/setup.sh
```

`setup.sh` does everything you need before the first run:

1. Verifies `node`, `npm`, and `docker` are installed.
2. Installs dependencies in the root, `backend/`, and `frontend/`.
3. Creates `backend/.env` from `backend/.env.example` (only if missing).
4. Generates strong random `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`
   values via `openssl rand` (or a Node `crypto.randomBytes` fallback).
5. Runs `prisma generate`.
6. Starts Postgres + Redis containers and waits for the Postgres healthcheck.
7. Applies all Prisma migrations.

After it finishes you're ready to run the app.

## Daily

```bash
./scripts/dev.sh
```

What it does:

1. Brings up Postgres + Redis if they aren't already running.
2. Waits for the Postgres container to report `healthy`.
3. Hands off to `concurrently` to launch three processes in parallel:
   - `api`    — Express on `http://localhost:4000` (blue)
   - `worker` — BullMQ check executor (magenta)
   - `web`    — Vite on `http://localhost:3000` (green)

`Ctrl+C` kills all three. Postgres + Redis keep running so your data
persists between sessions — run `./scripts/stop.sh` when you're truly done.

## All scripts

| Script | Purpose |
|---|---|
| `setup.sh`     | First-time setup. Idempotent — safe to re-run. |
| `dev.sh`       | Start the full stack. Ctrl+C to stop. |
| `stop.sh`      | `docker compose down` — stops Postgres + Redis (volumes preserved). |
| `migrate.sh`   | Apply pending Prisma migrations. Auto-starts Postgres if needed. |
| `reset.sh`     | **Destructive.** Drops the DB and re-runs migrations. Prompts for confirmation. |
| `logs.sh`      | Tail container logs. Optional service arg: `./scripts/logs.sh postgres`. |
| `build.sh`     | Production build for backend (tsc) + frontend (Vite). |
| `typecheck.sh` | `tsc --noEmit` on both packages. |

## Common workflows

**Fresh clone → running app:**
```bash
./scripts/setup.sh
./scripts/dev.sh
# open http://localhost:3000
```

**Coming back the next day:**
```bash
./scripts/dev.sh
```

**Pulled changes that include a new migration:**
```bash
./scripts/migrate.sh
./scripts/dev.sh
```

**Clean slate / something is broken:**
```bash
./scripts/reset.sh        # confirm with: reset
./scripts/dev.sh
```

**Done for the day:**
```bash
# Ctrl+C in the dev terminal
./scripts/stop.sh
```

## On Windows (Git Bash)

`chmod +x` and POSIX-style invocation work in Git Bash. If `chmod` doesn't
stick (some Windows configurations strip exec bits), you can always invoke
explicitly:

```bash
bash scripts/setup.sh
bash scripts/dev.sh
```

`docker compose` requires **Docker Desktop** to be running — its daemon is
what serves the `docker` CLI. The scripts will fail fast with a friendly
message if Docker isn't reachable.

## Equivalents

These bash scripts and the npm scripts in the root `package.json` do the
same things — pick whichever you prefer:

| Bash                       | npm                       |
|---|---|
| `./scripts/setup.sh`        | `npm run setup` (then `npm run db:up && npm run db:migrate` separately) |
| `./scripts/dev.sh`          | `npm run dev`             |
| `./scripts/stop.sh`         | `npm run db:down`         |
| `./scripts/migrate.sh`      | `npm run db:migrate`      |
| `./scripts/reset.sh`        | `npm run db:reset`        |
| `./scripts/logs.sh`         | `npm run db:logs`         |
| `./scripts/build.sh`        | `npm run build`           |
| `./scripts/typecheck.sh`    | `npm run typecheck`       |

The bash scripts add: pre-flight checks, healthcheck-based DB wait, automatic
JWT secret generation, and confirmation prompts for destructive operations.
