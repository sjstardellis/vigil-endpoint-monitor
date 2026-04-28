#!/usr/bin/env bash
# Production build for both backend (tsc) and frontend (Vite).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_lib.sh
source "${SCRIPT_DIR}/_lib.sh"
cd "${SCRIPT_DIR}/.."

ensure_node_modules

info "building backend…"
npm --prefix backend run build
ok "backend built → backend/dist"

info "building frontend…"
npm --prefix frontend run build
ok "frontend built → frontend/dist"
