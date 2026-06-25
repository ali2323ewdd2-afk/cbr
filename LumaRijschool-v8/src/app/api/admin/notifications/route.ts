import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { sendNotification } from '@/lib/notifications'
import {
  badRequestResponse,
  forbiddenResponse,
  parsePagination,
  readJson,
  requireAdminOnlySession,
  requireAdminSession,
  serverErrorResponse,
} from '@/lib/admin-api'

const notificationSchema = z.object({
  audience: z.enum(['ALL', 'USER']),
  userId: z.string().min(1).optional(),
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(5000),
  type: z.string().trim().min(1).max(80).default('SYSTEM'),
  link: z.string().trim().max(1000).optional().nullable(),
  channels: z.array(z.enum(['IN_APP', 'EMAIL', 'PUSH'])).min(1).default(['IN_APP']),
})

const deleteSchema = z.object({ id: z.string().min(1) })

export async function GET(req: Request) {
  const session = await requireAdminSession()
  if (!session) return forbiddenResponse()

  try {
    const url = new URL(req.url)
    const { page, pageSize, skip } = parsePagination(url)
    const search = url.searchParams.get('search')?.trim()
    const channel = url.searchParams.get('channel')?.trim()
    const where = {
      ...(channel ? { channel: { contains: channel, mode: 'insensitive' as const } } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' as const } },
              { body: { contains: search, mode: 'insensitive' as const } },
              { user: { name: { contains: search, mode: 'insensitive' as const } } },
              { user: { email: { contains: search, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.notification.count({ where }),
    ])
    return NextResponse.json({ notifications, total, page, pageSize })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

export async function POST(req: Request) {
  const session = await requireAdminOnlySession()
  if (!session) return forbiddenResponse()

  const parsed = await readJson(req, notificationSchema)
  if (parsed.error) return parsed.error

  try {
    const userIds = await resolveAudience(parsed.data.audience, parsed.data.userId)
    if (userIds.length === 0) return badRequestResponse('No recipients found')

    for (const userId of userIds) {
      await sendNotification({
        userId,
        type: parsed.data.type,
        title: parsed.data.title,
        body: parsed.data.body,
        link: parsed.data.link || undefined,
        channels: parsed.data.channels,
      })
    }

    await prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        action: 'ADMIN_NOTIFICATION_SENT',
        entity: 'Notification',
        metadata: JSON.stringify({ recipients: userIds.length, audience: parsed.data.audience }),
      },
    })
    return NextResponse.json({ ok: true, recipients: userIds.length }, { status: 201 })
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
  if (!parsed.data?.id) return badRequestResponse('Notification id is required')

  try {
    await prisma.notification.delete({ where: { id: parsed.data.id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

async function resolveAudience(audience: 'ALL' | 'USER', userId?: string) {
  if (audience === 'USER') return userId ? [userId] : []
  const users = await prisma.user.findMany({
    where: { banned: false },
    select: { id: true },
    take: 1000,
  })
  return users.map((user) => user.id)
}
