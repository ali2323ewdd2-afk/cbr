# Production Readiness Report — LumaRijschool v9

Verified in a from-scratch `docker compose build --no-cache` + `up -d` deployment of the full
stack on the audit VM. Target domain: `https://lumatheorie.nl`.

> The audit ran on an ephemeral build VM, not the public production server. Items requiring
> external secrets/DNS (Stripe live, real Let's Encrypt, SMTP, non-Chrome browsers) are listed
> in `REMAINING_ISSUES-v9.md` and were not faked.

## Verdict

**Production-ready to deploy, conditional on operator-supplied secrets/DNS** (Stripe keys,
real TLS cert, SMTP). No outstanding code defects.

## Build & deploy
| Step | Result |
|---|---|
| `npm run lint` | ✅ 0 errors |
| `npm run build` | ✅ standalone, 119 routes, `.next/standalone/server.js` present |
| `docker compose build --no-cache` | ✅ app, ws, nginx built |
| `docker compose up -d` | ✅ 7 services started |

## Container health
| Service | Status |
|---|---|
| postgres | Up (healthy) |
| redis | Up (healthy) |
| app | Up (healthy) |
| ws | Up (healthy) |
| nginx | Up |
| adminer | Up |
| backup (cron) | Up |

No restarting/crashed containers; app/nginx/ws logs clean.

## HTTP/HTTPS
- HTTP :80 → 301 → `https://lumatheorie.nl/`
- HTTPS :443 → HTTP/2 200; HSTS `max-age=31536000; includeSubDomains`
- `www.lumatheorie.nl` → 301 → `lumatheorie.nl`
- `/api/health` over TLS → `{ok:true, database:ok, redis:ok}`
- Verified with a self-signed cert (identical code path to a real cert).

## Application
- New-user lifecycle: register → onboarding → dashboard → practice exam → logout → re-login
  (data persisted). Verified in Chrome.
- Admin panel: dashboard, users, analytics, questions, settings load with real data.
- Real-time: client through nginx (TLS) receives a `notification` published to Redis
  (app → Redis → ws → Socket.io → client).

## Database
- `prisma db push` syncs the PostgreSQL schema cleanly. Prisma 6.19.2 pinned (no Prisma 7).
- Seeders idempotent: 0 postgres errors on re-seed and on app container recreate.

## API
- Public 200, protected 401, admin 403, unknown 404, `POST /api/auth/register` 200.
- No unexpected 500s observed.

## Security headers (nginx)
HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy present;
rate-limit zones for api/auth/tutor/static.

## Host note
Set `vm.overcommit_memory=1` on the production host (done on the audit host) to silence the
Redis background-save warning.
