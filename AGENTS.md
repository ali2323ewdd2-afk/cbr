# AGENTS.md

## Repository layout

- The repository root tracks `LumaRijschool-v8.zip`. The actual application lives in
  `LumaRijschool/LumaRijschool-v8/` (extracted from that zip). All commands below run
  from inside `LumaRijschool/LumaRijschool-v8` unless noted.
- App: **LumaRijschool** — a Dutch driving-theory (CBR) study platform.
  Next.js 16 (App Router, React 19, Turbopack) + Prisma 6 + PostgreSQL, with optional
  Redis, a Socket.io WebSocket mini-service, Stripe, NextAuth (JWT credentials), and SMTP.

## Cursor Cloud specific instructions

The startup update script already runs `npm install` and `prisma generate` inside
`LumaRijschool/LumaRijschool-v8` (extracting the zip first if the directory is missing).
The notes below cover the non-obvious, durable things the update script does **not** do.

### Services (dev mode)

| Service | Required? | How to run | Notes |
| --- | --- | --- | --- |
| PostgreSQL 16 | Yes | `sudo pg_ctlcluster 16 main start` | Local cluster on `:5432`. DB `lumarijschool`, role `luma` / `luma_password`. Not started automatically — start it before `npm run dev`. |
| Next.js app | Yes | `npm run dev` (`next dev -p 3000`) | Main app at http://localhost:3000. |
| Redis 7 | Optional | `sudo service redis-server start` | `src/lib/redis.ts` falls back to in-memory if `REDIS_URL` is unset, so the app runs without it. |
| WebSocket service | Optional | `npm run ws:dev` (port 3001) | Real-time notifications only; needs Redis to relay. |
| Stripe / SMTP / AI / Turnstile | Optional | n/a | Stripe throws only when a payment function is invoked without keys; SMTP logs emails to the console in dev; others are feature-gated. |

Nginx and the Docker Compose stack are production-only and are not needed for day-to-day
dev work. Docker is **not** part of the standard dev setup (the update script does not
install it), so a fresh VM has no Docker. The production stack *has* been verified to build
and run via `docker compose` — see "Production Docker stack" below for the caveats.

### Request handling: `proxy.ts`, not `middleware.ts` (important)

Request interception lives in `LumaRijschool/LumaRijschool-v8/proxy.ts` (Next.js 16
`proxy` convention, **Node.js runtime**). It calls Prisma (`ipBlock`, `systemSetting`).
Do **not** move this logic back into a `middleware.ts` / rename the function to
`middleware`: Next 16 runs `middleware.ts` on the **edge runtime**, where the standard
Prisma client throws `PrismaClientValidationError: ... run Prisma Client on edge runtime`,
which 500s every route in the production/standalone build (it silently "works" in
`next dev` only because no `x-forwarded-for` header is present so the Prisma branch is
skipped). `proxy.ts` (Node runtime) is required for Prisma to work there.

Note: `proxy.ts` protects `/api/*` (returns 401 without a token), but the protected
*page* routes (`/dashboard`, `/lessons`, …) are statically prerendered and are still
served to logged-out users (they fail their data fetches client-side with 401). This is
pre-existing app behavior, not an environment fault.

### Production Docker stack (only if you install Docker manually)

`docker compose` (in `LumaRijschool/LumaRijschool-v8`) builds postgres, redis, app, ws,
nginx, adminer, backup. Verified working caveats:
- The `app` and `ws` services require `.env.production` (git-ignored, so absent on a fresh
  checkout). Create it with at least `NEXTAUTH_SECRET` / `NEXTAUTH_URL`; compose injects
  `DATABASE_URL`/`REDIS_URL` for the container network.
- On Docker 29+, the in-VM daemon needs `storage-driver: fuse-overlayfs` **and**
  `features.containerd-snapshotter: false` in `/etc/docker/daemon.json`.
- The app container becomes `healthy` (proves the `ENV HOSTNAME=0.0.0.0` fix) and the
  entrypoint seeds + starts the server without hanging (proves the seeder `process.exit`
  fix). Reach the app through nginx on host port 80 (e.g. `curl http://localhost/api/health`).
- nginx serves the app even when the optional `adminer` service is down (`/adminer/`
  returns 502 only); `/adminer/` returns 200 when adminer is up.

### Environment file (important)

- `LumaRijschool/LumaRijschool-v8/.env` is git-ignored, so it is not committed. The version
  inside the zip ships a **stale SQLite** `DATABASE_URL` (`file:/home/z/...`) that does **not**
  match the PostgreSQL Prisma schema and will break `prisma`/the app if used as-is.
- For dev, `.env` must point at the local Postgres and define NextAuth vars, e.g.:
  ```
  NODE_ENV=development
  NEXTAUTH_URL=http://localhost:3000
  NEXTAUTH_SECRET=<any-long-random-string>
  DATABASE_URL="postgresql://luma:luma_password@localhost:5432/lumarijschool?schema=public"
  REDIS_URL="redis://localhost:6379"
  ```
- If a fresh VM does not already have a working `.env`, recreate it before running Prisma.

### Database bootstrap (one-time per fresh DB)

Run from `LumaRijschool/LumaRijschool-v8` after Postgres is up and `.env` is correct:

```
npm run db:push     # prisma db push (no SQL migrations folder exists; db push is the path used)
npm run db:seed     # scripts/seed.ts — see hang gotcha below
```

`npm run db:seed` also seeds RBAC roles/permissions (via `src/lib/rbac`), so the separate
`scripts/seed-rbac.ts` is not required for a working dataset.

Seeded demo accounts:
- Admin: `admin@lumarijschool.nl` / `admin123`
- Student: `ahmed@email.nl` / `student123`

### Gotcha: `npm run db:seed` does not exit on its own

The seed completes all DB work and prints `✅ Seed complete!`, but the Node process does
**not** exit afterward (a lingering ioredis/Prisma handle keeps the event loop alive).
Because the script is piped through `tail`, you may see no output until it is stopped.
Verify completion by checking row counts (e.g. `SELECT count(*) FROM "User"`) or by tailing
the log for `Seed complete`, then stop the process by its PID. The data is fully seeded even
though the process hangs.

### Auth / app behavior notes

- Registration (`/register`) does **not** auto-login. After registering you must log in via
  `/login`. NextAuth uses JWT credentials (`src/lib/auth.ts`).
- Authenticated pages (`/dashboard`, `/lessons`, etc.) call APIs that return `401` when there
  is no valid session; some of these client pages crash on the resulting `undefined` data if
  visited while logged out. Log in first; once authenticated these pages work.
- Lesson video players show "Video unavailable" in dev — lesson `videoUrl`s point at external
  hosts that are not seeded/available locally. This is expected and not an environment fault.

### Standard commands (defined in `package.json`)

- Lint: `npm run lint` (currently reports a few pre-existing `react-hooks/set-state-in-effect`
  errors in UI components — these are code issues, not environment issues).
- Tests: `npm test` (vitest; configured for `tests/unit/**/*.test.ts` — no test files exist yet).
- Build: `npm run build` (Next standalone output; succeeds).
- Health check: `curl http://localhost:3000/api/health` returns DB + Redis status.
