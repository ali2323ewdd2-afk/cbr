import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPPORT')) {
    return null
  }
  return session
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { action } = body as { action: 'BAN' | 'UNBAN' | 'DELETE' | 'EXTEND_SUB' }

  if (action === 'BAN') {
    const user = await prisma.user.update({ where: { id }, data: { banned: true } })
    await prisma.auditLog.create({
      data: { actorId: session.user.id, action: 'USER_BANNED', entity: 'User', entityId: id },
    })
    return NextResponse.json({ user })
  }
  if (action === 'UNBAN') {
    const user = await prisma.user.update({ where: { id }, data: { banned: false } })
    await prisma.auditLog.create({
      data: { actorId: session.user.id, action: 'USER_UNBANNED', entity: 'User', entityId: id },
    })
    return NextResponse.json({ user })
  }
  if (action === 'EXTEND_SUB') {
    const sub = await prisma.subscription.findUnique({ where: { userId: id } })
    if (sub) {
      const newExpiry = new Date(sub.expiresAt)
      newExpiry.setDate(newExpiry.getDate() + 30)
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { status: 'ACTIVE', expiresAt: newExpiry },
      })
      await prisma.auditLog.create({
        data: { actorId: session.user.id, action: 'SUB_EXTENDED', entity: 'User', entityId: id },
      })
    }
    return NextResponse.json({ ok: true })
  }
  if (action === 'DELETE') {
    await prisma.user.delete({ where: { id } })
    await prisma.auditLog.create({
      data: { actorId: session.user.id, action: 'USER_DELETED', entity: 'User', entityId: id },
    })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
