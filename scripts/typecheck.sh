#!/usr/bin/env bash
# Run tsc --noEmit on both packages.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_lib.sh
source "${SCRIPT_DIR}/_lib.sh"
cd "${SCRIPT_DIR}/.."

ensure_node_modules

info "typechecking backend…"
npm --prefix backend run typecheck
ok "backend typecheck passed"

info "typechecking frontend…"
npm --prefix frontend run typecheck
ok "frontend typecheck passed"
