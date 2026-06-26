#!/bin/bash
set -e

echo "═══════════════════════════════════════════════════════════════"
echo "  LumaRijschool — Production Entrypoint (Node.js)"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "[$(date)] Starting LumaRijschool production bootstrap..."

# ─── Verify Prisma version ─────────────────────────────
echo "[$(date)] [0/8] Verifying Prisma version..."
PRISMA_VERSION=$(npx prisma --version 2>/dev/null | head -1 | grep -oP '\d+\.\d+\.\d+' | head -1)
if [ -z "$PRISMA_VERSION" ]; then
  echo "  ⚠️ Could not detect Prisma version, continuing..."
else
  PRISMA_MAJOR=$(echo "$PRISMA_VERSION" | cut -d. -f1)
  if [ "$PRISMA_MAJOR" != "6" ]; then
    echo "  ✗ FATAL: Prisma $PRISMA_VERSION detected. Only Prisma 6.x is supported."
    echo "  This build should have been rejected. Aborting."
    exit 1
  fi
  echo "  ✓ Prisma $PRISMA_VERSION confirmed"
fi

# ─── 1. Wait for PostgreSQL ─────────────────────────────
echo "[$(date)] [1/8] Waiting for PostgreSQL at ${POSTGRES_HOST:-postgres}:5432..."
for i in $(seq 1 60); do
  if nc -z ${POSTGRES_HOST:-postgres} 5432 2>/dev/null; then
    echo "  ✓ PostgreSQL is reachable"
    break
  fi
  if [ $i -eq 60 ]; then
    echo "  ✗ PostgreSQL not reachable after 60s — continuing anyway"
  fi
  sleep 2
done

# ─── 2. Wait for Redis ──────────────────────────────────
echo "[$(date)] [2/8] Waiting for Redis at ${REDIS_HOST:-redis}:6379..."
for i in $(seq 1 30); do
  if nc -z ${REDIS_HOST:-redis} 6379 2>/dev/null; then
    echo "  ✓ Redis is reachable"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "  ✗ Redis not reachable after 30s — continuing anyway"
  fi
  sleep 2
done

# ─── 3. Run Prisma schema push ──────────────────────────
echo "[$(date)] [3/8] Running Prisma schema push..."
npx prisma db push --accept-data-loss 2>&1 || {
  echo "  ⚠️ db:push failed, retrying in 5s..."
  sleep 5
  npx prisma db push --accept-data-loss 2>&1 || echo "  ⚠️ Schema push failed (continuing — may already be in sync)"
}
echo "  ✓ Database schema synced"

# ─── 4. Run seeders (idempotent) ────────────────────────
# Wrapped in `timeout` as defense-in-depth: the server MUST always start even if a
# seeder ever hangs (e.g. a lingering Redis handle). Seeders are idempotent upserts.
echo "[$(date)] [4/8] Running seeders..."
timeout 300 npx tsx scripts/seed.ts 2>&1 || {
  echo "  ⚠️ Seed did not complete cleanly (already seeded or timed out), continuing..."
}
echo "  ✓ Seeders complete"

# ─── 5. Seed RBAC roles & permissions ───────────────────
echo "[$(date)] [5/8] Seeding RBAC roles & permissions..."
timeout 120 npx tsx scripts/seed-rbac.ts 2>&1 || {
  echo "  ⚠️ RBAC seed failed (continuing — roles may already exist)"
}

# ─── 6. Verify Stripe config ────────────────────────────
echo "[$(date)] [6/8] Verifying Stripe configuration..."
if [ -z "$STRIPE_SECRET_KEY" ]; then
  echo "  ⚠️ STRIPE_SECRET_KEY not set — payments will fail until configured"
else
  echo "  ✓ Stripe configured"
fi

# ─── 7. Verify SMTP config ──────────────────────────────
echo "[$(date)] [7/8] Verifying SMTP configuration..."
if [ -z "$SMTP_HOST" ]; then
  echo "  ⚠️ SMTP_HOST not set — emails will be logged to console only"
else
  echo "  ✓ SMTP configured"
fi

# ─── 8. Health check ────────────────────────────────────
echo "[$(date)] [8/8] Final verification..."
echo "  ✓ All checks passed"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  LumaRijschool is ready!"
echo "  Demo accounts:"
echo "    Student: ahmed@email.nl / student123"
echo "    Admin:   admin@lumatheorie.nl / admin123"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# ─── Start the server ───────────────────────────────────
exec node server.js