# LumaRijschool v8

Production-ready Dutch driving theory platform with student learning flows, exams, subscriptions, Stripe payments, realtime notifications, support, gamification, and a full admin panel.

## Requirements

- Node.js 20+
- PostgreSQL 16+
- Redis 7+
- npm or Bun
- Prisma 6.x

## Local setup

```bash
npm install
npm run db:generate
npm run dev
```

The health endpoint requires a reachable PostgreSQL database and Redis instance:

```bash
curl http://localhost:3000/api/health
```

## Quality checks

```bash
npm run lint
npm run build
npm run test
```

## Database

The Prisma schema uses PostgreSQL. Production schema changes are tracked under `prisma/migrations`.

For production deployments use Prisma migrations rather than destructive schema resets:

```bash
npx prisma migrate deploy
npm run db:generate
```

## Admin panel

Admin pages live under `/admin`. Existing `User.role` based admin access is preserved. New admin APIs are under `/api/admin/*` and use guarded session checks.

Major admin areas include users, lessons, exams, questions, topics, traffic signs, subscriptions, plans, payments, support, announcements, certificates, emails, templates, notifications, reviews, security, backups, analytics, and video analytics.

## Docker

The repository includes Dockerfiles and `docker-compose.yml` for app, websocket service, PostgreSQL, Redis, nginx, adminer, and backup service.

See `DEPLOYMENT.md` for production deployment steps.
