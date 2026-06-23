import { NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { forbiddenResponse, parsePagination, requireAdminSession, serverErrorResponse } from '@/lib/admin-api'

export async function GET(req: Request) {
  const session = await requireAdminSession()
  if (!session) return forbiddenResponse()

  try {
    const url = new URL(req.url)
    const search = url.searchParams.get('search') ?? ''
    const status = url.searchParams.get('status') ?? ''
    const role = url.searchParams.get('role') ?? ''
    const { page, pageSize, skip } = parsePagination(url)

    const where: Prisma.UserWhereInput = {}
    if (role) where.role = role
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (status === 'active') {
      where.subscription = { status: 'ACTIVE', expiresAt: { gt: new Date() } }
    } else if (status === 'expired') {
      where.OR = [...(where.OR ?? []), { subscription: { expiresAt: { lt: new Date() } } }]
    } else if (status === 'banned') {
      where.banned = true
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
              payments: true,
              notifications: true,
              xpEvents: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.user.count({ where }),
    ])

    return NextResponse.json({
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        country: u.country,
        createdAt: u.createdAt,
        lastLoginAt: u.lastLoginAt,
        banned: u.banned,
        subscription: u.subscription
          ? {
              id: u.subscription.id,
              plan: u.subscription.plan.name,
              status: u.subscription.status,
              expiresAt: u.subscription.expiresAt,
            }
          : null,
        stats: {
          examsTaken: u._count.examAttempts,
          lessonsCompleted: u._count.progress,
          payments: u._count.payments,
          notifications: u._count.notifications,
          activityEvents: u._count.xpEvents,
        },
      })),
      total,
      page,
      pageSize,
    })
  } catch (error) {
    return serverErrorResponse(error)
  }
}
