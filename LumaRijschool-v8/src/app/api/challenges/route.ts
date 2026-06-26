import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const now = new Date()
  const challenges = await prisma.challenge.findMany({
    where: { isActive: true, startDate: { lte: now }, endDate: { gte: now } },
    include: { users: { where: { userId: session.user.id } } },
    orderBy: { endDate: 'asc' },
  })
  return NextResponse.json({
    challenges: challenges.map((c) => ({
      ...c,
      myProgress: c.users[0]?.progress ?? 0,
      myCompleted: c.users[0]?.completed ?? false,
      myClaimedAt: c.users[0]?.claimedAt ?? null,
    })),
  })
}
