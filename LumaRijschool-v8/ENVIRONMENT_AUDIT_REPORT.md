# Environment Audit Report

## Summary

Deployment was blocked because `docker-compose.yml` references `.env.production` as a required service env file for `app` and `ws`, but the repository did not include a production environment template.

This audit added:

- `.env.example`
- `.env.production.example`
- `DEPLOYMENT_ENVIRONMENT_GUIDE.md`

The real `.env.production` file must be created on the deployment server by copying `.env.production.example` and replacing placeholders with real secrets.

## Required variables

### Core application

- `NODE_ENV`
- `PORT`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `SHOW_DEMO_CREDENTIALS`

### Database / Prisma / PostgreSQL

- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`
- `POSTGRES_HOST`
- `DATABASE_URL`

### Redis / websocket

- `REDIS_URL`
- `REDIS_HOST`
- `WS_PORT`

### Required for payments

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_WEEK`
- `STRIPE_PRICE_MONTH`

### Required for production email delivery

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

## Optional variables

- `BASELINE_EXISTING_DB`
- `BACKUP_DIR`
- `BACKUP_RETENTION_DAYS`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `AWS_S3_BUCKET`
- `STRIPE_PUBLISHABLE_KEY`

## Variables referenced in code/config and documented

All direct environment variable references found in source/config are documented in `.env.example`, `.env.production.example`, and `DEPLOYMENT_ENVIRONMENT_GUIDE.md`:

- `AWS_ACCESS_KEY_ID`
- `AWS_REGION`
- `AWS_S3_BUCKET`
- `AWS_SECRET_ACCESS_KEY`
- `BACKUP_DIR`
- `BACKUP_RETENTION_DAYS`
- `BASELINE_EXISTING_DB`
- `CI`
- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `NODE_ENV`
- `PORT`
- `POSTGRES_DB`
- `POSTGRES_HOST`
- `POSTGRES_PASSWORD`
- `POSTGRES_USER`
- `REDIS_HOST`
- `REDIS_URL`
- `SMTP_FROM`
- `SMTP_HOST`
- `SMTP_PASS`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `STRIPE_PRICE_MONTH`
- `STRIPE_PRICE_WEEK`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `WS_PORT`
- `SHOW_DEMO_CREDENTIALS`

## Documented but not currently read directly by source code

- `STRIPE_PUBLISHABLE_KEY`

It is included for operational completeness and future/client Stripe flows, but current checkout uses server-side Stripe sessions.

## Missing variables

No direct `process.env.*` or Docker Compose variables were found missing from the documentation/templates after this update.

Operational config note:

- `.z-ai-config` is not an environment variable, but may be required by the AI SDK. It is documented in `DEPLOYMENT_ENVIRONMENT_GUIDE.md`.

## Deployment blockers

1. `.env.production` must exist before `docker compose up`.
2. Real production secrets must replace every `CHANGE_ME_*` placeholder.
3. `NEXTAUTH_SECRET` must not use the development fallback.
4. Stripe checkout requires valid `STRIPE_SECRET_KEY` and plan price IDs.
5. Stripe webhooks require a valid `STRIPE_WEBHOOK_SECRET`.
6. SMTP delivery requires complete SMTP settings.
7. Existing databases created before migrations require one-time `BASELINE_EXISTING_DB=true`.

## Docker/Compose verification

Static verification:

- `docker-compose.yml` variables are represented in `.env.production.example`.
- `app` and `ws` use `.env.production`.
- `DATABASE_URL` and `REDIS_URL` are injected for Docker networking.
- Startup script uses `POSTGRES_HOST`, `REDIS_HOST`, and `BASELINE_EXISTING_DB`.
- Backup service uses `POSTGRES_*` and `BACKUP_DIR`.

Runtime limitation in this workspace:

- Docker CLI is not installed (`docker: command not found`), so `docker compose config` could not be executed here.
- Startup shell syntax was verified with `bash -n scripts/entrypoint.sh` and `sh -n nginx-entrypoint.sh`.

## Security recommendations

- Never commit `.env.production` with real values.
- Store `.env.production` with `chmod 600`.
- Generate `NEXTAUTH_SECRET` with `openssl rand -base64 32`.
- Use a strong unique PostgreSQL password.
- Rotate Stripe webhook secrets when changing webhook endpoints.
- Keep Adminer internal or behind additional authentication.
- Configure SMTP before enabling broadcast email in production.
