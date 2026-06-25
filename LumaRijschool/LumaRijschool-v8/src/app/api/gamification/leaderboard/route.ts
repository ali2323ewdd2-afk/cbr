import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTotalXp, levelFromXp } from '@/lib/gamification/engine'

// Leaderboard — top 20 students by XP this month
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const topUsers = await prisma.xPEvent.groupBy({
    by: ['userId'],
    where: { createdAt: { gte: startOfMonth } },
    _sum: { amount: true },
    orderBy: { _sum: { amount: 'desc' } },
    take: 20,
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
      xpThisMonth: u._sum.amount ?? 0,
      isMe: u.userId === session.user.id,
    }
  })

  // My own rank
  const myTotalXp = await getTotalXp(session.user.id)
  const { level } = levelFromXp(myTotalXp)
  const myRank = leaderboard.find((x) => x.isMe)?.rank ?? null

  return NextResponse.json({ leaderboard, myTotalXp, myLevel: level, myRank })
}
