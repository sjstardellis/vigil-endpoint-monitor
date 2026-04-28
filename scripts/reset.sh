#!/usr/bin/env bash
# DESTRUCTIVE: drops the database, re-runs all migrations from scratch.
# Confirms before running.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_lib.sh
source "${SCRIPT_DIR}/_lib.sh"
cd "${SCRIPT_DIR}/.."

require_cmd docker "Install Docker Desktop: https://docker.com"
ensure_env

warn "This will DROP the database and re-run all migrations."
warn "All monitors, users, checks, and incidents will be deleted."
printf "Type ${BOLD}reset${RESET} to confirm: "
read -r confirm
if [ "$confirm" != "reset" ]; then
  info "aborted"
  exit 0
fi

if ! docker compose ps postgres --status running --quiet >/dev/null 2>&1; then
  info "starting postgres…"
  docker compose up -d postgres
  wait_for_postgres
fi

info "resetting database…"
npm --prefix backend exec -- prisma migrate reset --force --skip-seed
ok "database reset"
