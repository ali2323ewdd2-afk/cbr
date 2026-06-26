import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import {
  badRequestResponse,
  forbiddenResponse,
  parsePagination,
  readJson,
  requireAdminSession,
  serverErrorResponse,
} from '@/lib/admin-api'

const createSchema = z.object({
  userId: z.string().min(1),
  planId: z.string().min(1),
  days: z.coerce.number().int().min(1).max(3650),
  status: z.string().trim().min(1).max(40).default('ACTIVE'),
  autoRenew: z.boolean().default(false),
})

const patchSchema = z.object({
  id: z.string().min(1),
  action: z.enum(['EXTEND', 'CANCEL', 'GRANT_FREE', 'SET_STATUS']),
  days: z.coerce.number().int().min(1).max(3650).optional(),
  status: z.string().trim().min(1).max(40).optional(),
})

const deleteSchema = z.object({ id: z.string().min(1) })

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export async function GET(req: Request) {
  const session = await requireAdminSession()
  if (!session) return forbiddenResponse()

  try {
    const url = new URL(req.url)
    const { page, pageSize, skip } = parsePagination(url)
    const search = url.searchParams.get('search')?.trim()
    const status = url.searchParams.get('status')?.trim()
    const now = new Date()
    const where = {
      ...(status === 'expired'
        ? { expiresAt: { lt: now } }
        : status
          ? { status: status.toUpperCase() }
          : {}),
      ...(search
        ? {
            OR: [
              { user: { name: { contains: search, mode: 'insensitive' as const } } },
              { user: { email: { contains: search, mode: 'insensitive' as const } } },
              { plan: { name: { contains: search, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    }

    const [subscriptions, total, plans] = await Promise.all([
      prisma.subscription.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          plan: { select: { id: true, name: true, slug: true, durationDays: true } },
        },
        orderBy: { expiresAt: 'asc' },
        skip,
        take: pageSize,
      }),
      prisma.subscription.count({ where }),
      prisma.plan.findMany({ where: { isActive: true }, orderBy: { priceCents: 'asc' }, select: { id: true, name: true } }),
    ])

    return NextResponse.json({
      subscriptions: subscriptions.map((subscription) => ({
        ...subscription,
        daysRemaining: Math.ceil((subscription.expiresAt.getTime() - now.getTime()) / 86_400_000),
      })),
      plans,
      total,
      page,
      pageSize,
    })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

export async function POST(req: Request) {
  const session = await requireAdminSession()
  if (!session) return forbiddenResponse()

  const parsed = await readJson(req, createSchema)
  if (parsed.error) return parsed.error

  try {
    const startedAt = new Date()
    const expiresAt = addDays(startedAt, parsed.data.days)
    const subscription = await prisma.subscription.upsert({
      where: { userId: parsed.data.userId },
      update: {
        planId: parsed.data.planId,
        status: parsed.data.status,
        startedAt,
        expiresAt,
        autoRenew: parsed.data.autoRenew,
        cancelledAt: null,
      },
      create: {
        userId: parsed.data.userId,
        planId: parsed.data.planId,
        status: parsed.data.status,
        startedAt,
        expiresAt,
        autoRenew: parsed.data.autoRenew,
      },
    })
    await prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        action: 'SUBSCRIPTION_GRANTED',
        entity: 'Subscription',
        entityId: subscription.id,
      },
    })
    return NextResponse.json({ subscription }, { status: 201 })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

export async function PATCH(req: Request) {
  const session = await requireAdminSession()
  if (!session) return forbiddenResponse()

  const parsed = await readJson(req, patchSchema)
  if (parsed.error) return parsed.error

  try {
    const current = await prisma.subscription.findUnique({ where: { id: parsed.data.id } })
    if (!current) return badRequestResponse('Subscription not found')

    const subscription = await prisma.subscription.update({
      where: { id: parsed.data.id },
      data: parsed.data.action === 'CANCEL'
        ? { status: 'CANCELLED', cancelledAt: new Date(), autoRenew: false }
        : parsed.data.action === 'SET_STATUS'
          ? { status: parsed.data.status ?? current.status }
          : {
              status: 'ACTIVE',
              expiresAt: addDays(current.expiresAt > new Date() ? current.expiresAt : new Date(), parsed.data.days ?? 30),
              cancelledAt: null,
              autoRenew: parsed.data.action !== 'GRANT_FREE' ? current.autoRenew : false,
            },
    })
    await prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        action: `SUBSCRIPTION_${parsed.data.action}`,
        entity: 'Subscription',
        entityId: subscription.id,
      },
    })
    return NextResponse.json({ subscription })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

export async function DELETE(req: Request) {
  const session = await requireAdminSession()
  if (!session) return forbiddenResponse()

  const id = new URL(req.url).searchParams.get('id')
  const parsed = id ? { data: { id }, error: null } : await readJson(req, deleteSchema)
  if (parsed.error) return parsed.error
  if (!parsed.data?.id) return badRequestResponse('Subscription id is required')

  try {
    const subscription = await prisma.subscription.update({
      where: { id: parsed.data.id },
      data: { status: 'CANCELLED', cancelledAt: new Date(), autoRenew: false },
    })
    return NextResponse.json({ subscription })
  } catch (error) {
    return serverErrorResponse(error)
  }
}
