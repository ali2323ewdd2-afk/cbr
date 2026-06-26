# Remaining Issues — LumaRijschool v9

No outstanding **code defects**. The items below require operator-supplied secrets, real DNS,
or hardware not available in the audit environment. None block deploying the code.

## Requires operator secrets (add via environment, then re-deploy)

### 1. Stripe (live payment verification)
Not testable without keys (and live charges are real money — use test keys first).
```
STRIPE_SECRET_KEY=sk_live_...        # or sk_test_... to validate safely
STRIPE_WEBHOOK_SECRET=whsec_...      # from the webhook endpoint below
STRIPE_PRICE_WEEK=price_1TmGH9LhjfWsYBOxL4ealOji
STRIPE_PRICE_MONTH=price_1TmGOELhjfWsYBOxICRWIsO9
STRIPE_PUBLISHABLE_KEY=pk_live_...   # optional
```
Create a Stripe webhook endpoint → `https://lumatheorie.nl/api/payments/webhook`
(events: `checkout.session.completed`, `invoice.payment_failed`, `charge.refunded`); copy its
signing secret into `STRIPE_WEBHOOK_SECRET`.

### 2. SMTP (email: verification, password reset, receipts)
Without these, email logs to the console (dev fallback).
```
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM="LumaRijschool <noreply@lumatheorie.nl>"
```

## Requires real DNS + server

### 3. Real Let's Encrypt certificate
The SSL config is proven locally with a self-signed cert. For the real domain:
```
# DNS A/AAAA: lumatheorie.nl + www.lumatheorie.nl -> server public IP; open 80 & 443
certbot certonly --webroot -w ./certbot/www -d lumatheorie.nl -d www.lumatheorie.nl \
  --email you@example.com --agree-tos --no-eff-email
cp /etc/letsencrypt/live/lumatheorie.nl/fullchain.pem ./certs/fullchain.pem
cp /etc/letsencrypt/live/lumatheorie.nl/privkey.pem  ./certs/privkey.pem
docker compose restart nginx
```
Set up auto-renewal (certbot timer/cron) + `docker compose restart nginx` post-renew hook.

## Environment limitation (cannot be unblocked by secrets)

### 4. Cross-browser / mobile testing
Verified in Chrome (desktop) only. Firefox, Safari, Edge and physical mobile/tablet devices
were not available in the audit environment.

## Hardening recommendations (optional)
- Add a nonce-based `Content-Security-Policy` (needs per-page testing vs Next.js/Tailwind).
- Serve a raster OG/social image (currently SVG).
- Persist `vm.overcommit_memory=1` on the host (`/etc/sysctl.conf`) for Redis.
