import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPPORT')) {
    return null
  }
  return session
}

export async function GET(req: Request) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const url = new URL(req.url)
  const search = url.searchParams.get('search') ?? ''
  const status = url.searchParams.get('status') ?? ''
  const page = parseInt(url.searchParams.get('page') ?? '1')
  const pageSize = parseInt(url.searchParams.get('pageSize') ?? '20')

  const where: any = { role: 'STUDENT' }
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { email: { contains: search } },
    ]
  }
  if (status === 'active') {
    where.subscription = { status: 'ACTIVE' }
  } else if (status === 'expired') {
    where.subscription = { status: 'EXPIRED' }
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        subscription: { include: { plan: true } },
        _count: {
          select: {
            examAttempts: { where: { status: 'COMPLETED' } },
            progress: { where: { status: 'COMPLETED' } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ])

  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      country: u.country,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
      banned: u.banned,
      subscription: u.subscription
        ? {
            plan: u.subscription.plan.name,
            status: u.subscription.status,
            expiresAt: u.subscription.expiresAt,
          }
        : null,
      stats: {
        examsTaken: u._count.examAttempts,
        lessonsCompleted: u._count.progress,
      },
    })),
    total,
    page,
    pageSize,
  })
}
