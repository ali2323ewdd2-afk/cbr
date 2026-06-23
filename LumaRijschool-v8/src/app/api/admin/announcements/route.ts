import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { publish } from '@/lib/redis'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPPORT')) return null
  return session
}

export async function GET() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const items = await prisma.announcement.findMany({
    orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
  })
  return NextResponse.json({ announcements: items })
}

export async function POST(req: Request) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { title, body, type, audience, startsAt, endsAt, isPinned } = await req.json()
  const announcement = await prisma.announcement.create({
    data: { title, body, type: type || 'INFO', audience: audience || 'ALL', isPinned: Boolean(isPinned), startsAt: startsAt ? new Date(startsAt) : new Date(), endsAt: endsAt ? new Date(endsAt) : null },
  })
  // Push to all clients in real-time
  await publish('system:announcement', announcement)
  return NextResponse.json({ announcement })
}
