import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: { replies: { include: { user: { select: { name: true, role: true } } }, orderBy: { createdAt: 'asc' } } },
  })
  if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (ticket.userId !== session.user.id && session.user.role !== 'ADMIN' && session.user.role !== 'SUPPORT') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return NextResponse.json({ ticket })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { body } = await req.json()
  if (!body) return NextResponse.json({ error: 'Body required' }, { status: 400 })
  const ticket = await prisma.supportTicket.findUnique({ where: { id } })
  if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (ticket.userId !== session.user.id && session.user.role !== 'ADMIN' && session.user.role !== 'SUPPORT') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const reply = await prisma.supportTicketReply.create({
    data: { ticketId: id, userId: session.user.id, body, isStaff: session.user.role === 'ADMIN' || session.user.role === 'SUPPORT' },
  })
  // If user replies to a resolved ticket, reopen
  if (ticket.status === 'RESOLVED' && ticket.userId === session.user.id) {
    await prisma.supportTicket.update({ where: { id }, data: { status: 'OPEN' } })
  }
  return NextResponse.json({ reply })
}
