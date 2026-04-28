#!/usr/bin/env bash
# Apply pending Prisma migrations against the running Postgres. Idempotent —
# safe to run repeatedly. Use this after a `git pull` that adds migrations.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_lib.sh
source "${SCRIPT_DIR}/_lib.sh"
cd "${SCRIPT_DIR}/.."

require_cmd docker "Install Docker Desktop: https://docker.com"
ensure_env

# Bring up the DB if it's not running yet — migrate without a DB is pointless.
if ! docker compose ps postgres --status running --quiet >/dev/null 2>&1; then
  info "postgres not running — starting it…"
  docker compose up -d postgres
  wait_for_postgres
fi

info "applying migrations…"
npm --prefix backend run prisma:deploy
ok "migrations applied"
