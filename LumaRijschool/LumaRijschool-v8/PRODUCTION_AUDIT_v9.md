# LumaRijschool v9 — Production Audit Report

Audit performed in a live, from-scratch Docker deployment of the full production stack
(PostgreSQL, Redis, Next.js app, WebSocket, Nginx, Adminer, backup cron) built with
`docker compose build --no-cache`. Domain target: `https://lumatheorie.nl`.

> Honesty note: this audit ran on an ephemeral build VM, not the public production server.
> Everything that can be verified without external credentials/DNS was actually executed and
> is reported with real evidence. Items that require secrets or real DNS (Stripe **live**
> charges, real Let's Encrypt issuance, SMTP delivery, non-Chrome browsers) are called out in
> "Remaining items / requires operator input" and were **not** faked.

---

## 1. Final verdict

**Production-ready for deploy, conditional on operator-supplied secrets/DNS.**

The application builds cleanly, all containers are healthy, the full request path works over
HTTP/2 + TLS through Nginx, auth/RBAC boundaries hold, the database schema + idempotent
seeders apply without errors, and the new-user and admin flows work end-to-end. The remaining
conditions (Stripe live keys, real TLS cert via DNS, SMTP) are deployment inputs, not code
defects.

---

## 2. Changelog (this audit)

| # | Area | Change |
|---|------|--------|
| 1 | Runtime | `middleware.ts` → `proxy.ts` (Node.js runtime) — fixes every-route 500 from Prisma on the edge runtime in Next 16. |
| 2 | Nginx | Adminer upstream resolved at request time (Docker DNS) so the proxy no longer crash-loops when the optional adminer service is down. |
| 3 | WS | Healthcheck probes the Socket.io handshake endpoint (the `/health` route is shadowed by `path:'/'`). |
| 4 | Security | `getAuthSecret()` refuses the hardcoded NextAuth secret in production (prevents forged session JWTs). |
| 5 | Correctness | `getBaseUrl()` derives the public origin from `NEXTAUTH_URL`/forwarded headers — fixes Stripe success/cancel URLs, sitemap & robots emitting `localhost` behind Nginx. |
| 6 | SEO/PWA | Added `app/manifest.ts` (PWA web manifest). |
| 7 | Seeders | Demo-student badges/lesson-progress/notifications/XP made idempotent — re-seeding no longer logs duplicate-key errors. |
| 8 | Deploy | Nginx now mounts `./certs` (TLS) and `./certbot/www` (ACME webroot) so HTTPS/Let's Encrypt can actually be wired up. |
| 9 | Robustness | Checkout route always returns JSON (503 on failure); register page handles non-OK checkout — fixes white-screen `Unexpected end of JSON input` crash. |
| 10 | Real-time | Socket.io path unified to `/socket.io/` (client + server + nginx) — real-time delivery now works end-to-end (was previously broken through nginx). |

(Earlier v9 work, already on this branch: HOSTNAME=0.0.0.0 Docker fix, seeder `process.exit`, RBAC seeder rewrite, domain → lumatheorie.nl, SEO metadata, lint cleanup.)

---

## 3. Bug fixes (root cause → fix → verification)

1. **All routes 500 in production.** Next 16 runs `middleware.ts` on the edge runtime; the
   middleware calls Prisma → `PrismaClientValidationError`. Fixed by migrating to `proxy.ts`
   (Node runtime). Verified: `/`, `/login` → 200; zero `edge runtime` errors in logs.
2. **Nginx crash-loop without adminer.** Bare `proxy_pass http://adminer:8080` resolved at
   config load. Fixed with `resolver 127.0.0.11` + variable upstream (`set` before
   `rewrite … break`). Verified: with adminer stopped, nginx stays up (restarts=0), `/` 200,
   `/adminer/` 502; with adminer up, `/adminer/` 200.
3. **WS perpetually unhealthy.** `path:'/'` shadows `/health`. Fixed healthcheck to probe the
   handshake. Verified: container `healthy`.
4. **Insecure auth secret fallback.** Verified app refuses to start in production without
   `NEXTAUTH_SECRET` (dev/build keep a labelled fallback).
5. **Wrong origin behind proxy.** Verified `robots.txt`/`sitemap.xml` now emit
   `https://lumatheorie.nl`; Stripe URLs use the configured origin.
6. **Checkout white-screen crash.** Verified: with Stripe unconfigured, registration shows a
   toast and lands on the dashboard (no runtime overlay).
7. **Seeder duplicate-key errors.** Verified: re-running the seeder and recreating the app
   container produce **0** postgres ERROR lines.

---

## 4. Docker verification

`docker compose build --no-cache` (app, ws, nginx) succeeded; `docker compose up -d` brought
up all 7 services. Final state:

| Service | Status |
|---|---|
| postgres | Up (healthy) |
| redis | Up (healthy) |
| app | Up (healthy) |
| ws | Up (healthy) |
| nginx | Up |
| adminer | Up |
| backup (cron) | Up |

No restarting/crashed containers. Health-checked services all healthy. App/Nginx/WS logs
clean; the only non-app log line is Redis's host-level `vm.overcommit_memory` warning (a host
sysctl tuning note, not a code defect — set `vm.overcommit_memory=1` on the host).

## 5. HTTPS verification

Wired cert mounts and tested with a self-signed cert for `lumatheorie.nl` (the SSL code path
is identical to a real cert):

- HTTP :80 → `301` to `https://lumatheorie.nl/`
- HTTPS :443 → `HTTP/2 200`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `www.lumatheorie.nl` → `301` → `lumatheorie.nl`
- `/api/health` over TLS → `{ok:true, database:ok, redis:ok}`

Requires operator input: real Let's Encrypt issuance (DNS A/AAAA for the domain → server +
port 80 reachable; then certbot webroot against `./certbot/www`).

## 6. Stripe verification

- Real-only integration (no mock); `STRIPE_SECRET_KEY` required, webhook signature verified.
- Price IDs are env-driven (`STRIPE_PRICE_WEEK`, `STRIPE_PRICE_MONTH`) — set them to the
  live IDs (`price_1TmGH9LhjfWsYBOxL4ealOji` €12,99/week, `price_1TmGOELhjfWsYBOxICRWIsO9`
  €35/month). Plans are seeded; wire the live price IDs via env at deploy.
- Checkout success/cancel URLs now use the public origin (was `localhost` behind Nginx).
- Failure path hardened (graceful 503 + toast).
- **Not executed:** live checkout/webhook/refund — requires live keys; live charges are real
  money and must be validated by the operator with Stripe test mode first.

## 7. Security audit

- Auth boundary verified: protected APIs → 401, admin APIs → 403, public APIs → 200.
- No hardcoded production secret (fix #4); secrets are env-driven.
- Nginx security headers present: HSTS, X-Frame-Options, X-Content-Type-Options,
  Referrer-Policy, Permissions-Policy. Rate-limit zones configured (api/auth/tutor/static).
- Recommendation (not applied): add a nonce-based `Content-Security-Policy` (needs careful
  testing against Next.js/Tailwind inline styles/scripts to avoid breakage).

## 8. Performance

- Standalone output build (119 routes); static pages prerendered, dynamic where needed.
- Nginx gzip + long-cache for `_next/static`/assets; Redis caching available (health-checked).
- Recommendation: serve a raster OG image (currently SVG) for richer social previews.

## 9. API verification

Representative sweep over HTTPS: public (`/api/health`, `/api/landing/stats`, `/api/plans`,
`/api/announcements`) → 200; `/api/guest/limits` → 400 without required `guestId` (correct
validation); protected (`/api/lessons`, `/api/gamification/me`, `/api/notifications`,
`/api/invoices`) → 401; `/api/admin/users` → 403; unknown route → 404; new-user
`POST /api/auth/register` → 200 with a userId. No unexpected 500s observed.

## 10. Database verification

- `prisma db push` syncs the PostgreSQL schema cleanly (no migrations folder; db push is the
  configured path). Prisma client v6.19.2 (pinned + overrides; no Prisma 7).
- Seeders apply admin/student/plans/topics/lessons/questions/exams/badges/ranks/RBAC/etc.
  and now run idempotently with **0** DB errors on re-seed.

## 11. Remaining items / requires operator input

- **Stripe live keys** (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, price IDs) — for live
  payment validation.
- **Real TLS cert** — DNS for `lumatheorie.nl` → server + certbot issuance.
- **SMTP creds** — email currently logs to console in dev; set SMTP_* for real delivery.
- **Cross-browser/mobile** — verified in Chrome (desktop). Firefox/Safari/Edge and physical
  mobile/tablet were not available in this environment.
- **CSP header** — recommended (see §7); not applied because a correct nonce-based policy
  for Next.js/Tailwind needs per-page testing to avoid breaking inline styles/scripts.

### Resolved during this audit (previously listed as follow-ups)
- **Real-time (Socket.io)** — FIXED. Client/server/nginx now agree on `/socket.io/`. Verified
  end-to-end: a client connected through nginx (TLS) receives a `notification` published to
  Redis (`scripts/ws-e2e-check.mjs`). App → Redis → ws → Socket.io → client all confirmed.
- **Redis `vm.overcommit_memory`** — set to `1` on the audit host; persist on the prod host
  with `echo 'vm.overcommit_memory = 1' | sudo tee -a /etc/sysctl.conf`.
