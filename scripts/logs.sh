#!/usr/bin/env bash
# Tail docker container logs. Pass a service name to scope to one:
#   ./scripts/logs.sh           # all containers
#   ./scripts/logs.sh postgres
#   ./scripts/logs.sh redis
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_lib.sh
source "${SCRIPT_DIR}/_lib.sh"
cd "${SCRIPT_DIR}/.."

require_cmd docker "Install Docker Desktop: https://docker.com"

if [ "$#" -eq 0 ]; then
  exec docker compose logs -f
else
  exec docker compose logs -f "$@"
fi
