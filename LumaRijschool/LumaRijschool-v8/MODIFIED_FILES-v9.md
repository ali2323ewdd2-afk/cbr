# Modified Files — LumaRijschool v9

## Audit changes (this audit, on top of the v9 import)

| File | Change | Why |
|---|---|---|
| `middleware.ts` → `proxy.ts` | renamed + fn `middleware`→`proxy` | Run on Node runtime (Prisma can't run on edge in Next 16) — fixes all-routes-500. |
| `src/lib/auth-secret.ts` | added | `getAuthSecret()` — refuse insecure hardcoded secret in production. |
| `src/lib/auth.ts` | modified | Use `getAuthSecret()`. |
| `src/lib/base-url.ts` | added | `getBaseUrl()` — correct public origin behind nginx. |
| `src/app/api/payments/checkout/route.ts` | modified | Use `getBaseUrl()`; always return JSON (503 on failure). |
| `src/app/sitemap.xml/route.ts` | modified | Use `getBaseUrl()`; drop unused prisma import. |
| `src/app/robots.txt/route.ts` | modified | Use `getBaseUrl()`. |
| `src/app/manifest.ts` | added | PWA web manifest. |
| `src/app/register/page.tsx` | modified | Handle non-OK checkout response (no white-screen crash). |
| `scripts/seed.ts` | modified | Idempotent demo-student badges/lesson-progress/notifications/XP. |
| `mini-services/ws/index.ts` | modified | Socket.io path `/socket.io/`. |
| `src/lib/realtime.ts` | modified | Client Socket.io path `/socket.io/`. |
| `Dockerfile.ws` | modified | Healthcheck → `/health` (path no longer shadowed). |
| `nginx-http.conf` | modified | Adminer upstream resolved at request time (resolver + variable). |
| `nginx-ssl.conf` | modified | Same adminer fix. |
| `docker-compose.yml` | modified | Mount `./certs` + `./certbot/www` on nginx for HTTPS/ACME. |
| `scripts/ws-e2e-check.mjs` | added | Ad-hoc real-time end-to-end checker. |
| `PRODUCTION_AUDIT_v9.md` | added | Full audit report. |
| `CHANGELOG-v9.md`, `PRODUCTION_READINESS_REPORT-v9.md`, `SECURITY_REPORT-v9.md`, `MODIFIED_FILES-v9.md`, `REMAINING_ISSUES-v9.md` | added | Deliverable reports. |
| `AGENTS.md` (repo root) | modified | Dev/cloud notes (proxy.ts, HTTPS, seeders, socket.io). |

## Earlier v9 import (already on the branch before this audit)

| File | Change |
|---|---|
| `Dockerfile` | `ENV HOSTNAME=0.0.0.0`; standalone runtime fixes. |
| `scripts/entrypoint.sh` | seeders wrapped in `timeout`; robust startup. |
| `scripts/seed.ts`, `scripts/seed-rbac.ts` | seeders `process.exit()`; RBAC seeder rewritten to `seedRolesAndPermissions()`. |
| `src/app/layout.tsx` | SEO metadata (metadataBase, OG, Twitter, robots, canonical). |
| domain references | `lumarijschool.nl` → `lumatheorie.nl`. |
| various UI files | lint fixes. |

Note: `.env`, `.env.production`, `./certs`, `./certbot`, `node_modules`, `.next` are
git-ignored and intentionally excluded from the package.
