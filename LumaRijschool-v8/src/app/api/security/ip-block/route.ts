import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { blockIp } from '@/lib/security'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPPORT')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const blocks = await prisma.ipBlock.findMany({ orderBy: { blockedAt: 'desc' }, take: 100 })
  return NextResponse.json({ blocks })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPPORT')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { ip, reason, expiresAt } = await req.json()
  await blockIp(ip, reason, session.user.id, expiresAt ? new Date(expiresAt) : undefined)
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPPORT')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { ip } = await req.json()
  await prisma.ipBlock.delete({ where: { ip } })
  return NextResponse.json({ ok: true })
}
