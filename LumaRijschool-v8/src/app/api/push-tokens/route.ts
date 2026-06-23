import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { token, platform, userAgent } = await req.json()
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 })
  await prisma.pushToken.upsert({
    where: { userId_token: { userId: session.user.id, token } },
    update: { platform, userAgent, isActive: true, updatedAt: new Date() },
    create: { userId: session.user.id, token, platform, userAgent },
  })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { token } = await req.json()
  await prisma.pushToken.updateMany({
    where: { userId: session.user.id, token },
    data: { isActive: false },
  })
  return NextResponse.json({ ok: true })
}
