import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

const PUBLIC_PATHS = [
  '/',
  '/login',
  '/register',
  '/pricing',
  '/about',
  '/contact',
  '/faq',
]

const ADMIN_ONLY_PATHS = [
  '/admin/backups',
  '/admin/certificates',
  '/admin/coupons',
  '/admin/email-templates',
  '/admin/emails',
  '/admin/exams',
  '/admin/invoices',
  '/admin/lessons',
  '/admin/monitoring',
  '/admin/notifications',
  '/admin/payments',
  '/admin/plans',
  '/admin/questions',
  '/admin/refunds',
  '/admin/results',
  '/admin/reviews',
  '/admin/roles',
  '/admin/security',
  '/admin/settings',
  '/admin/subscriptions',
  '/admin/topics',
  '/admin/traffic-signs',
  '/admin/video-analytics',
  '/admin/videos',
]

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const authSecret = process.env.NEXTAUTH_SECRET || (process.env.NODE_ENV === 'production' ? undefined : 'luma-rij-school-dev-secret-2026')

  // Allow public files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/internal/middleware-guard') ||
    pathname.startsWith('/api/public') ||
    pathname.startsWith('/api/landing') ||
    pathname.startsWith('/api/plans') ||
    pathname.startsWith('/api/guest') ||
    pathname.startsWith('/api/health') ||
    pathname.startsWith('/api/faq') ||
    pathname.startsWith('/api/traffic-signs') ||
    pathname.startsWith('/api/popular-searches') ||
    pathname.startsWith('/api/gamification/ranks') ||
    pathname.startsWith('/api/payments/webhook') ||
    pathname.startsWith('/api/payments/success') ||
    pathname.startsWith('/api/announcements') ||
    pathname.startsWith('/socket.io') ||
    pathname.startsWith('/favicon') ||
    pathname.match(/\.(svg|png|jpg|jpeg|webp|gif|ico|css|js|map)$/)
  ) {
    return NextResponse.next()
  }

  // IP blocking / maintenance check via Node runtime API.
  // Middleware runs on the Edge runtime, so it must not import Prisma directly.
  const ip = (req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '').split(',')[0].trim()
  const guardUrl = new URL('/api/internal/middleware-guard', req.url)
  if (ip) guardUrl.searchParams.set('ip', ip)
  guardUrl.searchParams.set('path', pathname)
  try {
    const guard = await fetch(guardUrl, { cache: 'no-store' })
    if (guard.status === 403) return new NextResponse('Forbidden', { status: 403 })
    if (guard.status === 503) return NextResponse.redirect(new URL('/maintenance', req.url))
  } catch {
    // If the DB-backed guard is unavailable, continue to avoid taking down static pages.
  }

  // Public pages
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next()
  }

  const token = await getToken({
    req,
    secret: authSecret,
  })

  // Maintenance is checked by the Node runtime guard above.

  // Admin route protection
  if (pathname.startsWith('/admin')) {
    if (!token) {
      return NextResponse.redirect(new URL('/login?from=' + pathname, req.url))
    }
    if (token.role !== 'ADMIN' && token.role !== 'SUPPORT') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    if (token.role !== 'ADMIN' && ADMIN_ONLY_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
      return NextResponse.redirect(new URL('/admin/support', req.url))
    }
    return NextResponse.next()
  }

  // App routes require auth
  if (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/lessons') ||
    pathname.startsWith('/exams') ||
    pathname.startsWith('/results') ||
    pathname.startsWith('/tutor') ||
    pathname.startsWith('/planner') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/subscribe') ||
    pathname.startsWith('/referral') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/support') ||
    pathname.startsWith('/mystery-box') ||
    pathname.startsWith('/challenges')
  ) {
    if (!token) {
      return NextResponse.redirect(new URL('/login?from=' + pathname, req.url))
    }
    return NextResponse.next()
  }

  // API routes that are not auth/public require token
  if (pathname.startsWith('/api/')) {
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
