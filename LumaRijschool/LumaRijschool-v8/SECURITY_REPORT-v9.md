# Security Report — LumaRijschool v9

## Summary
No critical vulnerabilities outstanding after this audit. One high-severity issue (hardcoded
auth secret fallback) was found and fixed. Remaining items are hardening recommendations.

## Findings & status

| # | Severity | Finding | Status |
|---|----------|---------|--------|
| 1 | High | `NEXTAUTH_SECRET` fell back to a known hardcoded string when unset — forged session JWTs (incl. admin) possible. | **Fixed** — `getAuthSecret()` refuses to start in production without the env var. |
| 2 | Medium | Reverse proxy (nginx) crash-looped when optional adminer was down, causing full outage. | **Fixed** — request-time DNS resolution; app stays served. |
| 3 | Medium | Stripe success/cancel URLs derived from `req.url` resolved to `localhost` behind nginx (broken/again-insecure redirect target). | **Fixed** — `getBaseUrl()` uses configured/forwarded origin. |
| 4 | Low | Unhandled 500 (empty body) from checkout caused a client crash. | **Fixed** — route returns JSON; client handles non-OK. |
| 5 | Info | No `Content-Security-Policy` header. | **Recommended** (not applied — a correct nonce-based CSP for Next.js/Tailwind needs per-page testing). |

## Authentication & authorization
- NextAuth JWT (credentials), bcrypt password hashing, 30-day session.
- Boundary verified on the running stack: protected APIs → 401, admin APIs → 403, public → 200.
- `proxy.ts` enforces auth for `/api/*` and admin routes (SUPPORT/ADMIN roles).
- RBAC roles/permissions seeded via the canonical `seedRolesAndPermissions()`.

## Transport security
- HTTP→HTTPS 301; HSTS (`max-age=31536000; includeSubDomains`); TLS 1.2/1.3; HTTP/2.
- Security headers: X-Frame-Options SAMEORIGIN, X-Content-Type-Options nosniff,
  Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy (camera/mic/geo off).

## Input handling & abuse protection
- nginx rate-limit zones: api (20r/s), auth (5r/s), tutor (10r/m), static (100r/s).
- Stripe webhook signature verified (`stripe.webhooks.constructEvent`).
- Client max body size 50M; server actions body limit 10MB.

## Secrets management
- No secrets committed. `.env`, `.env.production`, `./certs`, `./certbot` are git-ignored.
- Secrets are environment-driven (DB, Redis, NextAuth, Stripe, SMTP, AWS, VAPID, Turnstile).

## Recommendations (operator)
- Add a nonce-based CSP after per-page testing.
- Provide real `NEXTAUTH_SECRET`, Stripe live keys + webhook secret, and SMTP creds via env.
- Issue a real Let's Encrypt certificate (see `REMAINING_ISSUES-v9.md`).
