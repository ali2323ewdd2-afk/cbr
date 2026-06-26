import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { claimDailyReward } from '@/lib/gamification/engine'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const result = await claimDailyReward(session.user.id)
  return NextResponse.json(result)
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { prisma } = await import('@/lib/prisma')
  const lastClaim = await prisma.dailyRewardClaim.findFirst({
    where: { userId: session.user.id },
    orderBy: { claimedAt: 'desc' },
  })
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const alreadyClaimedToday = lastClaim && new Date(lastClaim.claimedAt).getTime() > today.getTime()
  return NextResponse.json({
    lastClaim,
    alreadyClaimedToday,
    nextDayNumber: lastClaim && lastClaim.dayNumber < 7 ? lastClaim.dayNumber + 1 : 1,
    rewards: [25, 50, 75, 100, 150, 200, 500],
  })
}
