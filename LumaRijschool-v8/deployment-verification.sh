#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

echo "== LumaRijschool deployment verification =="

if [ ! -f ".env.production" ]; then
  echo "ERROR: .env.production is missing."
  echo "Create it from .env.production.example or use the generated safe placeholder file."
  exit 1
fi

set -a
# shellcheck disable=SC1091
. ./.env.production
set +a

echo "== Required env check =="
required_vars=(
  NODE_ENV PORT NEXTAUTH_URL NEXTAUTH_SECRET
  POSTGRES_USER POSTGRES_PASSWORD POSTGRES_DB POSTGRES_HOST DATABASE_URL
  REDIS_URL REDIS_HOST WS_PORT
  STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET STRIPE_PRICE_WEEK STRIPE_PRICE_MONTH
  SMTP_HOST SMTP_PORT SMTP_SECURE SMTP_USER SMTP_PASS SMTP_FROM
  BACKUP_DIR BACKUP_RETENTION_DAYS
)
for key in "${required_vars[@]}"; do
  if [ -z "${!key:-}" ]; then
    echo "ERROR: $key is empty or unset"
    exit 1
  fi
done
echo "✓ required env present"

echo "== Install dependencies =="
npm install --include=dev

echo "== Prisma =="
npx prisma generate
npx prisma validate

echo "== Static verification =="
npm run lint
npx tsc --noEmit
npm run build
npm run test
bash -n scripts/entrypoint.sh
sh -n nginx-entrypoint.sh

if command -v docker >/dev/null 2>&1; then
  echo "== Docker Compose config =="
  docker compose --env-file .env.production config >/tmp/lumarijschool-compose-config.yml
  echo "✓ docker compose config"

  echo "== Docker Compose build =="
  docker compose --env-file .env.production build
  echo "✓ docker compose build"

  echo "== Optional runtime verification =="
  if [ "${RUN_COMPOSE_UP:-false}" = "true" ]; then
    docker compose --env-file .env.production up -d
    echo "Waiting for health endpoint..."
    for _ in $(seq 1 60); do
      if curl -fsS http://localhost/api/health >/tmp/lumarijschool-health.json 2>/dev/null; then
        echo "✓ app health ok"
        break
      fi
      sleep 5
    done
    curl -fsS http://localhost/login >/dev/null && echo "✓ login page"
    curl -fsS http://localhost/register >/dev/null && echo "✓ register page"
    curl -fsS http://localhost/admin >/dev/null && echo "✓ admin page"
    curl -fsS http://localhost/socket.io/ >/dev/null || true
  else
    echo "RUN_COMPOSE_UP=false; skipped docker compose up runtime checks."
  fi
else
  echo "WARN: docker is not installed; skipped docker compose config/build/up checks."
fi

echo "== Done =="
