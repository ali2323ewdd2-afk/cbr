import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email/service'
import { z } from 'zod'

const schema = z.object({
  subject: z.string().min(3).max(120),
  body: z.string().min(10).max(5000),
  category: z.enum(['GENERAL', 'PAYMENT', 'TECHNICAL', 'CONTENT', 'ACCOUNT']).default('GENERAL'),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const tickets = await prisma.supportTicket.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { replies: true } } },
  })
  return NextResponse.json({ tickets })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.user.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const ticket = await prisma.supportTicket.create({
    data: { userId: session.user.id, subject: parsed.data.subject, body: parsed.data.body, category: parsed.data.category, priority: parsed.data.priority },
  })
  // Notify admins (broadcast)
  const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { email: true } })
  await Promise.all(admins.map((a) => sendEmail({
    to: a.email,
    subject: `[Ticket #${ticket.id}] ${ticket.subject}`,
    html: `<p>Nieuwe support ticket van ${session.user.email}</p><p>${ticket.body}</p>`,
  })))
  return NextResponse.json({ ticket })
}
