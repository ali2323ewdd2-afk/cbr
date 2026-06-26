import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { audit } from '@/lib/security'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Generate a one-time login token (valid for 5 min)
  // The frontend will use this to set a session as the target user
  const token = `impersonate_${session.user.id}_${id}_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`
  await prisma.systemSetting.upsert({
    where: { key: token },
    update: { value: JSON.stringify({ targetUserId: id, adminId: session.user.id, expiresAt: Date.now() + 300000 }), category: 'IMPERSONATE' },
    create: { key: token, value: JSON.stringify({ targetUserId: id, adminId: session.user.id, expiresAt: Date.now() + 300000 }), category: 'IMPERSONATE' },
  })
  await audit({ actorId: session.user.id, action: 'IMPERSONATE_LOGIN', entity: 'User', entityId: id })
  return NextResponse.json({ token, redirectUrl: `/api/auth/impersonate?token=${token}` })
}
