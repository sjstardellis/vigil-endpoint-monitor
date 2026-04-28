#!/usr/bin/env bash
# Stop the Postgres + Redis containers. Data persists in named volumes.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_lib.sh
source "${SCRIPT_DIR}/_lib.sh"
cd "${SCRIPT_DIR}/.."

require_cmd docker "Install Docker Desktop: https://docker.com"

info "stopping postgres + redis…"
docker compose down
ok "containers stopped (volumes preserved)"
