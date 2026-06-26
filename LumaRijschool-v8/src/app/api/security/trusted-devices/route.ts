import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const devices = await prisma.trustedDevice.findMany({
    where: { userId: session.user.id },
    orderBy: { lastSeen: 'desc' },
  })
  return NextResponse.json({ devices })
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { deviceId } = await req.json()
  await prisma.trustedDevice.deleteMany({
    where: { id: deviceId, userId: session.user.id },
  })
  return NextResponse.json({ ok: true })
}
