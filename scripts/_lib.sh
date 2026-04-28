# Shared helpers — sourced by the other scripts. Not executable on its own.

BLUE='\033[34m'
GREEN='\033[32m'
YELLOW='\033[33m'
RED='\033[31m'
DIM='\033[2m'
BOLD='\033[1m'
RESET='\033[0m'

info() { printf "${BLUE}→${RESET} %s\n" "$1"; }
ok()   { printf "${GREEN}✓${RESET} %s\n" "$1"; }
warn() { printf "${YELLOW}!${RESET} %s\n" "$1"; }
err()  { printf "${RED}✗${RESET} %s\n" "$1" >&2; }

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    err "'$1' not found. $2"
    exit 1
  fi
}

ensure_env() {
  if [ ! -f backend/.env ]; then
    err "backend/.env missing. Run: ./scripts/setup.sh"
    exit 1
  fi
}

ensure_node_modules() {
  if [ ! -d backend/node_modules ] || [ ! -d frontend/node_modules ]; then
    err "Dependencies not installed. Run: ./scripts/setup.sh"
    exit 1
  fi
}

wait_for_postgres() {
  info "waiting for postgres to be healthy…"
  local tries=0
  until [ "$(docker inspect -f '{{.State.Health.Status}}' endpoint-monitor-postgres 2>/dev/null)" = "healthy" ]; do
    tries=$((tries + 1))
    if [ "$tries" -gt 60 ]; then
      err "postgres did not become healthy within 60s"
      exit 1
    fi
    sleep 1
  done
  ok "postgres ready"
}
