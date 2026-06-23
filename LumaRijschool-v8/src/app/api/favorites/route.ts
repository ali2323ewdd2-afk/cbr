import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Add or remove a favorite (signs, lessons, exams)
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { entityType, entityId, action } = await req.json() // action: 'add' | 'remove'
  if (!['SIGN', 'LESSON', 'EXAM'].includes(entityType)) return NextResponse.json({ error: 'Invalid type' }, { status: 400 })

  if (action === 'remove') {
    await prisma.userFavorite.deleteMany({
      where: { userId: session.user.id, entityType, entityId },
    })
    return NextResponse.json({ ok: true, favorited: false })
  }

  await prisma.userFavorite.upsert({
    where: { userId_entityType_entityId: { userId: session.user.id, entityType, entityId } },
    update: {},
    create: { userId: session.user.id, entityType, entityId },
  })
  return NextResponse.json({ ok: true, favorited: true })
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const url = new URL(req.url)
  const entityType = url.searchParams.get('type') as 'SIGN' | 'LESSON' | 'EXAM' | null

  const where: any = { userId: session.user.id }
  if (entityType) where.entityType = entityType
  const favorites = await prisma.userFavorite.findMany({ where, orderBy: { createdAt: 'desc' } })

  // If signs, join with sign data
  let enriched = favorites
  if (entityType === 'SIGN' && favorites.length > 0) {
    const signIds = favorites.map((f) => f.entityId)
    const signs = await prisma.trafficSign.findMany({ where: { id: { in: signIds } } })
    enriched = favorites.map((f) => ({ ...f, sign: signs.find((s) => s.id === f.entityId) }))
  }

  return NextResponse.json({ favorites: enriched })
}
