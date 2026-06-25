import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPPORT')) return null
  return session
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true } },
      replies: { include: { user: { select: { name: true, role: true } } }, orderBy: { createdAt: 'asc' } },
    },
  })
  if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ticket })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { body, action } = await req.json()
  if (body) {
    await prisma.supportTicketReply.create({
      data: { ticketId: id, userId: session.user.id, body, isStaff: true },
    })
    await prisma.supportTicket.update({ where: { id }, data: { status: 'ANSWERED', updatedAt: new Date() } })
  }
  if (action === 'CLOSE') {
    await prisma.supportTicket.update({ where: { id }, data: { status: 'CLOSED' } })
  }
  if (action === 'RESOLVE') {
    await prisma.supportTicket.update({ where: { id }, data: { status: 'RESOLVED' } })
  }
  return NextResponse.json({ ok: true })
}
