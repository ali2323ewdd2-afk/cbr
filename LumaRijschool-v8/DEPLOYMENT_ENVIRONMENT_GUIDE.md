# LumaRijschool v8 Deployment Environment Guide

This guide is the source of truth for deploying LumaRijschool v8 with Docker Compose.

## Immediate deployment blocker

`docker-compose.yml` references:

```yaml
env_file:
  - .env.production
```

Docker Compose fails when `.env.production` does not exist.

Create it from the committed template:

```bash
cp .env.production.example .env.production
chmod 600 .env.production
editor .env.production
docker compose --env-file .env.production config
docker compose up -d --build
```

Do **not** commit `.env.production` with real secrets.

## Required variables

| Variable | Purpose | Required | Example value | Production format |
|---|---|---:|---|---|
| `NODE_ENV` | Node/Next runtime mode. | Yes | `production` | `production` |
| `PORT` | Next.js app port inside container. | Yes | `3000` | Integer, normally `3000` |
| `NEXTAUTH_URL` | Public canonical URL used by NextAuth, redirects, emails, cookies. | Yes | `https://lumatheorie.nl` | Full HTTPS origin, no trailing slash |
| `NEXTAUTH_SECRET` | Signs/encrypts NextAuth JWT/session cookies and impersonation tokens. | Yes | `CHANGE_ME_RANDOM_32_BYTE_OR_LONGER_SECRET` | Strong random secret, 32+ bytes |
| `SHOW_DEMO_CREDENTIALS` | Shows demo credentials in logs/UI when explicitly enabled. | Optional | `false` | `true` or `false`; keep `false` in production |
| `POSTGRES_USER` | PostgreSQL username created by postgres container. | Yes | `luma` | Plain username |
| `POSTGRES_PASSWORD` | PostgreSQL password. | Yes | `CHANGE_ME_STRONG_DATABASE_PASSWORD` | Strong password; URL-encode if manually used in URLs |
| `POSTGRES_DB` | PostgreSQL database name. | Yes | `lumarijschool` | Database identifier |
| `POSTGRES_HOST` | Host checked by startup script before migrations. | Yes for Docker | `postgres` | Docker service name or hostname |
| `DATABASE_URL` | Prisma PostgreSQL connection URL. In Docker Compose it is also injected from `POSTGRES_*`. | Yes | `postgresql://luma:...@postgres:5432/lumarijschool?schema=public` | PostgreSQL URL |
| `REDIS_URL` | Redis connection for cache, rate limits, RBAC cache, realtime pub/sub. | Yes | `redis://redis:6379` | Redis URL |
| `REDIS_HOST` | Host checked by startup script before app start. | Yes for Docker | `redis` | Docker service name or hostname |
| `WS_PORT` | WebSocket service port. | Yes | `3001` | Integer, normally `3001` |

## Required when payments are enabled

The application can boot without Stripe keys, but real checkout/refunds/webhooks require them.

| Variable | Purpose | Required | Example value | Production format |
|---|---|---:|---|---|
| `STRIPE_SECRET_KEY` | Server-side Stripe API key. | Yes for payments | `sk_live_CHANGE_ME` | Stripe live secret key |
| `STRIPE_WEBHOOK_SECRET` | Verifies Stripe webhook signatures. | Yes for webhooks | `whsec_CHANGE_ME` | Stripe webhook signing secret |
| `STRIPE_PUBLISHABLE_KEY` | Browser/client Stripe key. Documented for pricing UI and future client flows. | Recommended | `pk_live_CHANGE_ME` | Stripe live publishable key |
| `STRIPE_PRICE_WEEK` | Stripe Price ID for `WEEK` plan seed/update. | Yes for `WEEK` checkout | `price_123...` | Stripe Price ID |
| `STRIPE_PRICE_MONTH` | Stripe Price ID for `MONTH` plan seed/update. | Yes for `MONTH` checkout | `price_456...` | Stripe Price ID |

## Required when email delivery is enabled

Without SMTP settings, the email service logs mail in development style and does not deliver real email.

| Variable | Purpose | Required | Example value | Production format |
|---|---|---:|---|---|
| `SMTP_HOST` | SMTP server hostname. | Yes for email | `smtp.mailgun.org` | Hostname |
| `SMTP_PORT` | SMTP server port. | Yes for email | `587` | Integer, commonly `587` or `465` |
| `SMTP_SECURE` | Whether to use TLS from connection start. | Yes for email | `false` | `true` for 465, otherwise `false` |
| `SMTP_USER` | SMTP username. | Yes for email | `postmaster@example.com` | Provider username |
| `SMTP_PASS` | SMTP password/API key. | Yes for email | `CHANGE_ME_SMTP_PASSWORD` | Provider secret |
| `SMTP_FROM` | Sender identity. | Recommended | `LumaRijschool <noreply@example.com>` | RFC 5322 from string |

## Migration / database bootstrap variables

| Variable | Purpose | Required | Example value | Production format |
|---|---|---:|---|---|
| `BASELINE_EXISTING_DB` | Marks baseline migration as applied for an existing database created before migrations. Use once only. | Optional | `false` | `true` or `false` |

Fresh database:

```bash
BASELINE_EXISTING_DB=false
docker compose up -d --build
```

Existing pre-migration database:

```bash
BASELINE_EXISTING_DB=true docker compose up -d app
# After successful migration, set it back to false.
```

## Backups and uploads

| Variable | Purpose | Required | Example value | Production format |
|---|---|---:|---|---|
| `BACKUP_DIR` | Directory for manual admin backup files. | Optional in Docker | `/app/backups` | Absolute path inside app container |
| `BACKUP_RETENTION_DAYS` | Legacy backup script retention days. | Optional | `30` | Integer |
| `AWS_ACCESS_KEY_ID` | Enables optional S3 backup upload when set with secret and bucket. | Optional | `AKIA...` | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | AWS secret for optional S3 backup upload. | Optional | `CHANGE_ME_AWS_SECRET` | AWS secret |
| `AWS_REGION` | AWS region for optional S3 backups. | Optional | `eu-central-1` | AWS region |
| `AWS_S3_BUCKET` | S3 bucket for optional backup uploads. | Optional | `lumarijschool-backups` | Bucket name |

Admin media uploads are stored under:

```text
public/uploads/admin
```

Docker Compose mounts `app_uploads` to `/app/public/uploads` so uploaded files survive app container replacement.

SSL certificates should be placed on the host under:

```text
./certs/fullchain.pem
./certs/privkey.pem
```

Docker Compose mounts `./certs` read-only to `/etc/nginx/certs`, and nginx auto-enables HTTPS when both files exist.

In multi-instance deployments, use shared storage for uploads or move `src/lib/media-storage.ts` to object storage.

## CI / GitHub Actions variables

These are not runtime `.env.production` variables, but GitHub deployment secrets.

| Secret | Purpose |
|---|---|
| `DOCKER_REGISTRY` | Registry host used by deploy workflow. |
| `DOCKER_USERNAME` | Registry username. |
| `DOCKER_PASSWORD` | Registry password/token. |
| `SERVER_HOST` | Deployment server hostname/IP. |
| `SERVER_USER` | SSH user. |
| `SERVER_SSH_KEY` | SSH private key. |

## Variables referenced in code/config

Used by application/runtime:

- `NODE_ENV`
- `PORT`
- `SHOW_DEMO_CREDENTIALS`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `DATABASE_URL`
- `POSTGRES_HOST`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`
- `REDIS_URL`
- `REDIS_HOST`
- `WS_PORT`

Operational config file:

- `.z-ai-config` may be required by `z-ai-web-dev-sdk` depending on your AI provider setup. It is intentionally not committed and should be mounted/provided by deployment automation if the AI tutor is enabled.
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_WEEK`
- `STRIPE_PRICE_MONTH`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `BACKUP_DIR`
- `BACKUP_RETENTION_DAYS`
- `BASELINE_EXISTING_DB`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `AWS_S3_BUCKET`
- `CI` (test runner only)

Documented for operational completeness but not currently read by source code:

- `STRIPE_PUBLISHABLE_KEY`

Mentioned in comments or future/stub code but not currently read directly:

- VAPID/web-push variables are not read by current code.
- ZAI SDK configuration is handled by `z-ai-web-dev-sdk`; no direct `process.env.ZAI_*` reference exists in this repository.
- Sentry variables are not read in committed source.
- Turnstile variables are not read in committed source.

## Deployment blockers detected

1. `.env.production` missing blocks `docker compose up`.
2. `NEXTAUTH_SECRET` must be set to a strong value; fallback exists in code but must not be used in production.
3. `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and plan price IDs must be configured before payment launch.
4. SMTP variables must be configured before production email delivery.
5. Existing databases created before migrations require one-time `BASELINE_EXISTING_DB=true`.

## Security recommendations

- Generate `NEXTAUTH_SECRET` with at least 32 bytes of entropy:

  ```bash
  openssl rand -base64 32
  ```

- Use a unique high-entropy `POSTGRES_PASSWORD`.
- Store real `.env.production` outside version control with mode `600`.
- Rotate Stripe webhook secrets when changing webhook endpoints.
- Do not expose Adminer publicly without additional access control.
- Mount `public/uploads/admin` to persistent storage and restrict sensitive support attachment access in a future hardening pass.

## Minimum production `.env.production`

At minimum, replace placeholders for:

- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `POSTGRES_PASSWORD`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_WEEK`
- `STRIPE_PRICE_MONTH`
- SMTP variables if email delivery is required

Then run:

```bash
docker compose --env-file .env.production config
docker compose up -d --build
docker compose ps
curl -f https://YOUR_DOMAIN/api/health
```
