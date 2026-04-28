#!/usr/bin/env bash
# Bring up Postgres + Redis (if not already), then run the API, BullMQ worker,
# and Vite dev server in parallel with colored prefixes. Ctrl+C kills all three.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_lib.sh
source "${SCRIPT_DIR}/_lib.sh"
cd "${SCRIPT_DIR}/.."

require_cmd docker "Install Docker Desktop: https://docker.com"
ensure_env
ensure_node_modules

info "starting postgres + redis…"
docker compose up -d >/dev/null
wait_for_postgres

info "launching api, worker, web…"
echo

# Hand off to concurrently — it gives nice colored prefixes and signal-handles
# all three children correctly across platforms.
exec npx --no-install concurrently \
  --kill-others \
  --names api,worker,web \
  --prefix-colors blue,magenta,green \
  "npm --prefix backend run dev" \
  "npm --prefix backend run dev:worker" \
  "npm --prefix frontend run dev"
