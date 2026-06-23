import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { awardXp } from '@/lib/gamification/engine'
import { cacheDel } from '@/lib/redis'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [avatars, owned] = await Promise.all([
    prisma.avatar.findMany({ orderBy: [{ category: 'asc' }, { costXp: 'asc' }] }),
    prisma.userAvatar.findMany({ where: { userId: session.user.id }, include: { avatar: true } }),
  ])
  const equipped = owned.find((o) => o.isEquipped)
  return NextResponse.json({
    avatars,
    owned: owned.map((o) => ({ ...o.avatar, isEquipped: o.isEquipped, purchasedAt: o.purchasedAt })),
    equipped: equipped?.avatar ?? null,
  })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { avatarId, action } = await req.json() // action: 'buy' | 'equip'

  if (action === 'equip') {
    await prisma.userAvatar.updateMany({ where: { userId: session.user.id, isEquipped: true }, data: { isEquipped: false } })
    await prisma.userAvatar.updateMany({ where: { userId: session.user.id, avatarId }, data: { isEquipped: true } })
    return NextResponse.json({ ok: true })
  }

  // Buy
  const avatar = await prisma.avatar.findUnique({ where: { id: avatarId } })
  if (!avatar) return NextResponse.json({ error: 'Avatar not found' }, { status: 404 })

  const existing = await prisma.userAvatar.findUnique({
    where: { userId_avatarId: { userId: session.user.id, avatarId } },
  })
  if (existing) return NextResponse.json({ error: 'Already owned' }, { status: 400 })

  // Check XP
  const totalXp = await prisma.xPEvent.aggregate({ where: { userId: session.user.id }, _sum: { amount: true } })
  const balance = totalXp._sum.amount ?? 0
  if (balance < avatar.costXp) return NextResponse.json({ error: 'Niet genoeg XP' }, { status: 400 })

  // Deduct XP
  await prisma.xPEvent.create({ data: { userId: session.user.id, amount: -avatar.costXp, reason: 'AVATAR_PURCHASE', refId: avatar.id } })
  await cacheDel(`user:${session.user.id}:xp`)
  await prisma.userAvatar.create({ data: { userId: session.user.id, avatarId, isEquipped: true } })
  // Unequip others
  await prisma.userAvatar.updateMany({
    where: { userId: session.user.id, avatarId: { not: avatarId }, isEquipped: true },
    data: { isEquipped: false },
  })

  return NextResponse.json({ ok: true, avatar })
}
