import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPPORT')) return null
  return session
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  await prisma.announcement.update({ where: { id }, data: { isActive: false } })
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { title, body, type, audience, startsAt, endsAt, isPinned, isActive } = await req.json()
  const announcement = await prisma.announcement.update({
    where: { id },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(body !== undefined ? { body } : {}),
      ...(type !== undefined ? { type } : {}),
      ...(audience !== undefined ? { audience } : {}),
      ...(startsAt !== undefined ? { startsAt: startsAt ? new Date(startsAt) : new Date() } : {}),
      ...(endsAt !== undefined ? { endsAt: endsAt ? new Date(endsAt) : null } : {}),
      ...(isPinned !== undefined ? { isPinned: Boolean(isPinned) } : {}),
      ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
    },
  })
  return NextResponse.json({ announcement })
}
