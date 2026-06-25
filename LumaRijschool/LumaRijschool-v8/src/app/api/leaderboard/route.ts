import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTotalXp } from '@/lib/gamification/engine'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const period = url.searchParams.get('period') || 'all' // week | month | all

  const now = new Date()
  let since: Date | null = null
  if (period === 'week') {
    since = new Date(now.getTime() - 7 * 86400000)
  } else if (period === 'month') {
    since = new Date(now.getFullYear(), now.getMonth(), 1)
  }

  const where: any = {}
  if (since) where.createdAt = { gte: since }

  const topUsers = await prisma.xPEvent.groupBy({
    by: ['userId'],
    where,
    _sum: { amount: true },
    orderBy: { _sum: { amount: 'desc' } },
    take: 50,
  })

  const userIds = topUsers.map((u) => u.userId)
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, avatarUrl: true },
  })

  const leaderboard = topUsers.map((u, i) => {
    const u0 = users.find((x) => x.id === u.userId)
    return {
      rank: i + 1,
      userId: u.userId,
      name: u0?.name ?? 'Anoniem',
      avatarUrl: u0?.avatarUrl,
      xp: u._sum.amount ?? 0,
    }
  })

  return NextResponse.json({ leaderboard, period })
}
