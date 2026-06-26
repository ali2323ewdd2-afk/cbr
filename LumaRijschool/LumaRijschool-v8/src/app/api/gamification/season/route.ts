import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getActiveSeasonPass } from '@/lib/gamification/engine'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const season = await getActiveSeasonPass()
  if (!season) return NextResponse.json({ season: null, progress: null })
  let progress = await prisma.userSeasonPass.findFirst({
    where: { userId: session.user.id, seasonPassId: season.id },
  })
  if (!progress) {
    progress = await prisma.userSeasonPass.create({
      data: { userId: session.user.id, seasonPassId: season.id, claimedRewards: JSON.stringify([]) },
    })
  }
  return NextResponse.json({ season, progress })
}
