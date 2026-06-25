import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getReferralStats, getReferralLeaderboard } from '@/lib/referral'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const stats = await getReferralStats(session.user.id)
  const baseUrl = process.env.NEXTAUTH_URL || 'https://lumatheorie.nl'
  const link = `${baseUrl}/register?ref=${stats.code}`

  // Recent referrals
  const recent = await prisma.referral.findMany({
    where: { referrerId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { referred: { select: { name: true, email: true, createdAt: true } } },
  })

  return NextResponse.json({
    code: stats.code,
    link,
    totalReferrals: stats.totalReferrals,
    convertedReferrals: stats.convertedReferrals,
    totalXpEarned: stats.totalXpEarned,
    recent: recent.map((r) => ({
      id: r.id,
      name: r.referred?.name ?? 'Anoniem',
      email: r.referred?.email?.replace(/(.{2}).*(@.*)/, '$1***$2'),
      date: r.createdAt,
      converted: !!r.convertedAt,
      reward: r.rewardAmount,
    })),
  })
}
