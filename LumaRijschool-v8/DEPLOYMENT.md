# LumaRijschool v8 Deployment Guide

## 1. Configure environment

Copy `.env.example` to your deployment environment and provide production values:

- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `REDIS_URL`
- Stripe keys and price IDs
- SMTP settings
- Optional AWS S3 backup settings

Never commit real secrets.

## 2. Install and build

```bash
npm install
npm run db:generate
npm run lint
npm run test
npm run build
```

## 3. Database migration

Run migrations against PostgreSQL:

```bash
npx prisma migrate deploy
npm run db:generate
```

The admin production migration is additive and preserves existing data.

## 4. Docker Compose deployment

```bash
docker compose up -d --build
docker compose ps
```

Check health:

```bash
curl https://your-domain.example/api/health
```

The health check requires both PostgreSQL and Redis to be reachable.

## 5. Backups

Backups use `pg_dump` and are stored in the configured backup directory. The admin backup panel supports:

- manual backup creation
- listing backup files
- checksum verification
- download
- restore with explicit `RESTORE` confirmation

Ensure `pg_dump`, `pg_restore`, and `psql` are available in the runtime container before enabling restore workflows.

## 6. Media uploads

Admin uploads are written to:

```text
public/uploads/admin
```

For multi-instance production deployments, mount this path to persistent shared storage or replace `src/lib/media-storage.ts` with S3-compatible storage while preserving the returned public URL contract.

## 7. Post-deploy checks

- Login/register still work.
- Admin user can access `/admin`.
- Admin CRUD pages load.
- Stripe checkout/webhook configured with live keys.
- Redis websocket service is online.
- `npm run build` passes for the deployed revision.
