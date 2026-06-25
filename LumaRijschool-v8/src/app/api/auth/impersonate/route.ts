import { NextResponse } from 'next/server'
import { encode } from 'next-auth/jwt'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const tokenPayloadSchema = z.object({
  targetUserId: z.string().min(1),
  adminId: z.string().min(1),
  expiresAt: z.number(),
})

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token')
  if (!token) return NextResponse.redirect(new URL('/login?error=InvalidImpersonationToken', req.url))

  const setting = await prisma.systemSetting.findUnique({ where: { key: token } })
  if (!setting || setting.category !== 'IMPERSONATE') {
    return NextResponse.redirect(new URL('/login?error=InvalidImpersonationToken', req.url))
  }

  const parsed = tokenPayloadSchema.safeParse(JSON.parse(setting.value))
  if (!parsed.success || parsed.data.expiresAt < Date.now()) {
    await prisma.systemSetting.delete({ where: { key: token } }).catch(() => null)
    return NextResponse.redirect(new URL('/login?error=ExpiredImpersonationToken', req.url))
  }

  const user = await prisma.user.findUnique({ where: { id: parsed.data.targetUserId } })
  if (!user || user.banned) {
    await prisma.systemSetting.delete({ where: { key: token } }).catch(() => null)
    return NextResponse.redirect(new URL('/login?error=UserUnavailable', req.url))
  }

  const secret = process.env.NEXTAUTH_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'luma-rij-school-dev-secret-2026')
  if (!secret) return NextResponse.redirect(new URL('/login?error=ServerMisconfigured', req.url))
  const maxAge = 30 * 24 * 60 * 60
  const sessionToken = await encode({
    token: {
      id: user.id,
      sub: user.id,
      name: user.name ?? user.email,
      email: user.email,
      role: user.role,
      impersonatedBy: parsed.data.adminId,
    },
    secret,
    maxAge,
  })

  await prisma.systemSetting.delete({ where: { key: token } }).catch(() => null)
  const secure = (process.env.NEXTAUTH_URL ?? '').startsWith('https://') || process.env.NODE_ENV === 'production'
  const response = NextResponse.redirect(new URL('/dashboard', req.url))
  response.cookies.set(secure ? '__Secure-next-auth.session-token' : 'next-auth.session-token', sessionToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge,
  })
  return response
}
