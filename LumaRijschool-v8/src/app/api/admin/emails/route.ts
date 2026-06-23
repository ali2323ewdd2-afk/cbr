import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email/service'
import {
  forbiddenResponse,
  parsePagination,
  readJson,
  requireAdminSession,
  serverErrorResponse,
} from '@/lib/admin-api'

const emailSchema = z.object({
  audience: z.enum(['ALL', 'SUBSCRIBERS', 'USER', 'TEST']),
  userId: z.string().min(1).optional(),
  testEmail: z.string().email().optional(),
  subject: z.string().trim().min(1).max(200),
  html: z.string().trim().min(1).max(100_000),
})

export async function GET(req: Request) {
  const session = await requireAdminSession()
  if (!session) return forbiddenResponse()

  try {
    const url = new URL(req.url)
    const { page, pageSize, skip } = parsePagination(url)
    const search = url.searchParams.get('search')?.trim()
    const where = search
      ? {
          OR: [
            { subject: { contains: search, mode: 'insensitive' as const } },
            { audience: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}
    const [emails, total] = await Promise.all([
      prisma.emailLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: pageSize }),
      prisma.emailLog.count({ where }),
    ])
    return NextResponse.json({ emails, total, page, pageSize })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

export async function POST(req: Request) {
  const session = await requireAdminSession()
  if (!session) return forbiddenResponse()

  const parsed = await readJson(req, emailSchema)
  if (parsed.error) return parsed.error

  try {
    const log = await prisma.emailLog.create({
      data: {
        audience: parsed.data.audience,
        userId: parsed.data.userId || null,
        subject: parsed.data.subject,
        html: parsed.data.html,
        status: 'PENDING',
      },
    })

    const recipients = await resolveRecipients(parsed.data)
    let sentCount = 0
    let lastError: string | null = null
    for (const recipient of recipients) {
      const result = await sendEmail({
        to: recipient,
        subject: parsed.data.subject,
        html: parsed.data.html,
      })
      if (result) {
        sentCount += 1
      } else {
        lastError = `Failed to send to ${recipient}`
      }
    }

    const updated = await prisma.emailLog.update({
      where: { id: log.id },
      data: {
        status: lastError ? 'FAILED' : 'SENT',
        sentCount,
        error: lastError,
        sentAt: new Date(),
      },
    })

    await prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        action: 'ADMIN_EMAIL_SENT',
        entity: 'EmailLog',
        entityId: updated.id,
      },
    })
    return NextResponse.json({ email: updated, recipients: recipients.length }, { status: 201 })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

async function resolveRecipients(input: z.infer<typeof emailSchema>) {
  if (input.audience === 'TEST') return input.testEmail ? [input.testEmail] : []
  if (input.audience === 'USER') {
    if (!input.userId) return []
    const user = await prisma.user.findUnique({ where: { id: input.userId }, select: { email: true } })
    return user ? [user.email] : []
  }
  if (input.audience === 'SUBSCRIBERS') {
    const subscriptions = await prisma.subscription.findMany({
      where: { status: 'ACTIVE', expiresAt: { gt: new Date() } },
      include: { user: { select: { email: true } } },
      take: 1000,
    })
    return Array.from(new Set(subscriptions.map((subscription) => subscription.user.email)))
  }
  const users = await prisma.user.findMany({
    where: { banned: false },
    select: { email: true },
    take: 1000,
  })
  return users.map((user) => user.email)
}
