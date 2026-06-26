import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPPORT')) return null
  return session
}

const attachmentSchema = z.object({
  fileName: z.string().min(1),
  fileUrl: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.coerce.number().int().min(0),
})

const postSchema = z.object({
  body: z.string().trim().max(10_000).optional(),
  action: z.enum(['CLOSE', 'RESOLVE', 'REOPEN']).optional(),
  attachments: z.array(attachmentSchema).default([]),
})

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true } },
      attachments: { orderBy: { createdAt: 'asc' } },
      replies: {
        include: {
          user: { select: { name: true, role: true } },
          attachments: { orderBy: { createdAt: 'asc' } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })
  if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ticket })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const parsed = postSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
  const { body, action, attachments } = parsed.data
  if (body) {
    const reply = await prisma.supportTicketReply.create({
      data: { ticketId: id, userId: session.user.id, body, isStaff: true },
    })
    if (attachments.length > 0) {
      await prisma.supportTicketAttachment.createMany({
        data: attachments.map((attachment) => ({
          ticketId: id,
          replyId: reply.id,
          userId: session.user.id,
          fileName: attachment.fileName,
          fileUrl: attachment.fileUrl,
          mimeType: attachment.mimeType,
          sizeBytes: attachment.sizeBytes,
        })),
      })
    }
    await prisma.supportTicket.update({ where: { id }, data: { status: 'ANSWERED', updatedAt: new Date() } })
  }
  if (action === 'CLOSE') {
    await prisma.supportTicket.update({ where: { id }, data: { status: 'CLOSED' } })
  }
  if (action === 'RESOLVE') {
    await prisma.supportTicket.update({ where: { id }, data: { status: 'RESOLVED' } })
  }
  if (action === 'REOPEN') {
    await prisma.supportTicket.update({ where: { id }, data: { status: 'OPEN' } })
  }
  return NextResponse.json({ ok: true })
}
