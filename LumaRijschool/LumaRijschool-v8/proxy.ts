import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'

const PUBLIC_PATHS = [
  '/',
  '/login',
  '/register',
  '/pricing',
  '/about',
  '/contact',
  '/faq',
]

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow public files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/public') ||
    pathname.startsWith('/api/landing') ||
    pathname.startsWith('/api/plans') ||
    pathname.startsWith('/api/guest') ||
    pathname.startsWith('/api/health') ||
    pathname.startsWith('/api/announcements') ||
    pathname.startsWith('/socket.io') ||
    pathname.startsWith('/favicon') ||
    pathname.match(/\.(svg|png|jpg|jpeg|webp|gif|ico|css|js|map)$/)
  ) {
    return NextResponse.next()
  }

  // IP blocking check
  const ip = (req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '').split(',')[0].trim()
  if (ip) {
    const blocked = await prisma.ipBlock.findUnique({ where: { ip } })
    if (blocked && (!blocked.expiresAt || blocked.expiresAt > new Date())) {
      return new NextResponse('Forbidden', { status: 403 })
    }
  }

  // Public pages
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next()
  }

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET || 'luma-rij-school-dev-secret-2026',
  })

  // Maintenance mode check (only for non-admins)
  if (token && token.role !== 'ADMIN') {
    const maintenanceMode = await prisma.systemSetting.findUnique({ where: { key: 'MAINTENANCE_MODE' } })
    if (maintenanceMode?.value === 'true' && !pathname.startsWith('/maintenance')) {
      return NextResponse.redirect(new URL('/maintenance', req.url))
    }
  }

  // Admin route protection
  if (pathname.startsWith('/admin')) {
    if (!token) {
      return NextResponse.redirect(new URL('/login?from=' + pathname, req.url))
    }
    if (token.role !== 'ADMIN' && token.role !== 'SUPPORT') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
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
