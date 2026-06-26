# CHANGELOG — LumaRijschool v9

All changes relative to the imported v8 source. Target domain: `https://lumatheorie.nl`.

## v9 — Production audit & hardening

### Critical / blocking fixes
- **Docker startup (HOSTNAME)**: added `ENV HOSTNAME=0.0.0.0` to the runner stage so the
  Next.js standalone server binds to all interfaces (Docker auto-set HOSTNAME to the
  container id, breaking the healthcheck and marking the container unhealthy).
- **Entrypoint seed hang**: seeders now `process.exit()` and the entrypoint wraps them in
  `timeout`, so `node server.js` always starts.
- **All routes 500 in production**: migrated edge `middleware.ts` → Node-runtime `proxy.ts`
  (Next.js 16). The standard Prisma client cannot run on the edge runtime; the proxy queries
  Prisma, so every route returned 500 in the standalone build.

### Security
- **NextAuth secret**: added `getAuthSecret()` (`src/lib/auth-secret.ts`). The app now
  refuses to start in production if `NEXTAUTH_SECRET` is unset instead of falling back to a
  known hardcoded secret (which would allow forging session JWTs). Used by `auth.ts` and
  `proxy.ts`.

### Correctness
- **Proxy-aware base URL**: added `getBaseUrl()` (`src/lib/base-url.ts`). Fixes Stripe
  success/cancel URLs, `sitemap.xml`, and `robots.txt` emitting `http://localhost:3000`
  behind nginx. Now derived from `NEXTAUTH_URL`/`APP_URL` then forwarded headers.
- **Checkout robustness**: `/api/payments/checkout` always returns JSON (503 on failure);
  the register page checks `r2.ok` before parsing — fixes the `Unexpected end of JSON input`
  white-screen crash when Stripe is unavailable.
- **Idempotent seeders**: demo-student badges, lesson progress, notifications and XP events
  use upserts/resets so re-seeding (the entrypoint re-seeds every start) no longer logs
  duplicate-key errors.

### Real-time
- **Socket.io path unified to `/socket.io/`** across the client (`src/lib/realtime.ts`),
  server (`mini-services/ws/index.ts`) and nginx. Real-time delivery now works end-to-end
  through nginx (previously the handshake hit the Next app). WS healthcheck restored to
  `/health` (no longer shadowed). Added `scripts/ws-e2e-check.mjs` verifier.

### Infrastructure / deploy
- **nginx resilient to optional adminer**: adminer upstream resolved at request time via
  Docker DNS so the reverse proxy no longer crash-loops when adminer is down.
- **HTTPS wiring**: nginx now mounts `./certs` (TLS) and `./certbot/www` (ACME webroot) so
  dropping a cert enables HTTPS and Let's Encrypt HTTP-01 has a webroot.
- **WS healthcheck**: probes the correct endpoint so the container reports healthy.

### SEO / PWA
- Added `src/app/manifest.ts` (PWA web manifest).
- (From the v9 import) `metadataBase`, canonical, OpenGraph, Twitter, robots metadata; domain
  migrated to `lumatheorie.nl`; RBAC seeder rewritten; lint cleaned.

### Docs / reports
- `PRODUCTION_AUDIT_v9.md`, `CHANGELOG-v9.md`, `PRODUCTION_READINESS_REPORT-v9.md`,
  `SECURITY_REPORT-v9.md`, `MODIFIED_FILES-v9.md`, `REMAINING_ISSUES-v9.md`.
