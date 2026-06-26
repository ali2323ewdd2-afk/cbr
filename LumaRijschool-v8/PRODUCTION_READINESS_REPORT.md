# Production Readiness Report

## Scope

This report covers the fixes applied for the critical and high-priority audit findings around security, Stripe payments, admin runtime stability, support attachments, refunds, migrations, and backup restore safety.

## Fixed critical items

- Stripe webhook is publicly reachable through middleware and returns controlled Stripe errors instead of auth failures.
- Stripe success callback is public-safe and still verifies the Stripe session before activation.
- Payment activation now persists the Stripe Payment Intent ID when available.
- Refund creation updates `Payment.status` to `REFUNDED` when Stripe succeeds.
- Admin user detail no longer returns `passwordHash`.
- Roles and permissions metadata endpoints now require admin/support session.
- Dangerous user operations are restricted:
  - create user: ADMIN only
  - delete user: ADMIN only
  - change password: ADMIN only
  - login-as remains ADMIN only
- SUPPORT users are restricted from sensitive admin pages via middleware and hidden nav items.
- Backup POST actions are ADMIN-only; restore requires explicit `RESTORE` confirmation.
- The legacy restore-preview endpoint also requires `RESTORE` confirmation.
- Support attachment upload flow now returns both `url` and `fileUrl`, matching support API validation.
- Admin dashboard, analytics, AI usage, monitoring, exam detail, and guests pages now handle API error payloads safely.

## Fixed high-priority items

- Production entrypoint now uses `prisma migrate deploy` instead of `prisma db push --accept-data-loss`.
- A baseline migration was generated for fresh deployments.
- Existing pre-migration databases can be baselined explicitly with `BASELINE_EXISTING_DB=true`.
- Docker runtime includes `postgresql-client` for `pg_dump`, `pg_restore`, and `psql`.
- Seeded plans now apply `STRIPE_PRICE_WEEK` and `STRIPE_PRICE_MONTH` when provided.
- Public traffic signs respect `isPublished`.
- Public lesson ratings only return approved and visible reviews.
- New or updated lesson ratings are reset to `PENDING`.
- Admin-created exams no longer default to empty question sets; when no explicit questions are sent, published questions are selected automatically.
- Local video lessons now send play/pause/seek/end analytics events.
- Successful exam submissions issue a certificate once per attempt.
- Student certificate API filters revoked certificates.
- Student certificate PDF button now links to the PDF.
- Bulk email and notification broadcasts require confirmation.
- User deletion requires confirmation.
- Arbitrary settings writes are blocked by an allowlist.

## Verification performed

- `npm run lint` passed.
- `npx tsc --noEmit` passed.
- `npm run build` passed.
- `npm run test` passed.
- Development server started.
- Admin page smoke verification returned HTTP 200 for all checked admin pages.
- Admin APIs without session returned expected 403.
- Stripe webhook POST without signature returned 400, confirming middleware no longer blocks it with 401.

## Known environment limitations

- This Cloud workspace does not have PostgreSQL/Redis running.
- `/api/health` returned 503 locally because it requires both DB and Redis.
- DB-backed public APIs such as `/api/traffic-signs` cannot be fully runtime-verified here without a live database.

## Remaining follow-up recommendations

- Add full E2E tests with a real PostgreSQL service.
- Add private authenticated file serving for sensitive support attachments instead of public upload URLs.
- Add full coupon application in checkout.
- Add a dedicated exam question assignment UI.
- Add role assignment UI and a permissions page.
