/**
 * Resolves the app's public base URL (origin).
 *
 * Behind nginx the raw request URL reflects the internal hop (e.g.
 * `http://localhost:3000`), which is wrong for anything user-visible
 * (Stripe success/cancel URLs, sitemap/robots links, emails). Prefer the
 * configured public URL, then proxy-forwarded headers, then the request origin.
 */
export function getBaseUrl(req: Request): string {
  const configured = process.env.NEXTAUTH_URL || process.env.APP_URL
  if (configured) return configured.replace(/\/+$/, '')

  const proto = req.headers.get('x-forwarded-proto') ?? 'https'
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host')
  if (host) return `${proto}://${host}`

  return new URL(req.url).origin
}
