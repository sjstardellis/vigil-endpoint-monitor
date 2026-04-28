#!/usr/bin/env bash
# First-time setup: installs deps, creates .env with random JWT secrets,
# generates the Prisma client, brings up Postgres + Redis, runs migrations.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_lib.sh
source "${SCRIPT_DIR}/_lib.sh"
cd "${SCRIPT_DIR}/.."

printf "${BOLD}Endpoint Monitor — setup${RESET}\n\n"

require_cmd node "Install Node 20+: https://nodejs.org"
require_cmd npm "Comes with Node."
require_cmd docker "Install Docker Desktop: https://docker.com"

info "installing root deps…"
npm install --silent
ok "root deps installed"

info "installing backend deps…"
npm --prefix backend install --silent
ok "backend deps installed"

info "installing frontend deps…"
npm --prefix frontend install --silent
ok "frontend deps installed"

if [ ! -f backend/.env ]; then
  info "creating backend/.env from .env.example…"
  cp backend/.env.example backend/.env
  ok "backend/.env created"
else
  warn "backend/.env already exists — leaving it alone"
fi

# Replace placeholder JWT secrets with strong random values, only if still placeholders.
if grep -q "replace-with-32-char-random-string-minimum" backend/.env; then
  info "generating JWT secrets…"
  if command -v openssl >/dev/null 2>&1; then
    ACCESS_SECRET="$(openssl rand -base64 48 | tr -d '\n')"
    REFRESH_SECRET="$(openssl rand -base64 48 | tr -d '\n')"
  else
    ACCESS_SECRET="$(node -e 'console.log(require("crypto").randomBytes(48).toString("base64"))')"
    REFRESH_SECRET="$(node -e 'console.log(require("crypto").randomBytes(48).toString("base64"))')"
  fi
  # Use | as delimiter since base64 may contain / and +
  sed -i.bak "s|replace-with-32-char-random-string-minimum|${ACCESS_SECRET}|" backend/.env
  sed -i.bak "s|replace-with-another-32-char-random-string|${REFRESH_SECRET}|" backend/.env
  rm -f backend/.env.bak
  ok "JWT secrets written to backend/.env"
fi

info "generating Prisma client…"
npm --prefix backend run prisma:generate --silent
ok "Prisma client generated"

info "starting postgres + redis…"
docker compose up -d
wait_for_postgres

info "applying database migrations…"
npm --prefix backend run prisma:deploy --silent
ok "migrations applied"

printf "\n${BOLD}${GREEN}Setup complete.${RESET}\n"
printf "Next: ${BOLD}./scripts/dev.sh${RESET}  (or ${BOLD}npm run dev${RESET})\n"
