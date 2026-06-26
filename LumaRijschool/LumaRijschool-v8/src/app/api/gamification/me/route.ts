import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTotalXp, levelFromXp } from '@/lib/gamification/engine'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      badges: { include: { badge: true } },
      achievements: { include: { achievement: true } },
      streak: true,
    },
  })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const totalXp = await getTotalXp(user.id)
  const { level, xpIntoLevel, xpForNext, progress } = levelFromXp(totalXp)

  // All badges (locked + unlocked)
  const allBadges = await prisma.badge.findMany()
  const unlockedIds = new Set(user.badges.map((b) => b.badgeId))
  const badges = allBadges.map((b) => ({ ...b, unlocked: unlockedIds.has(b.id) }))

  // All achievements
  const allAchievements = await prisma.achievement.findMany()
  const myAchMap = new Map(user.achievements.map((a) => [a.achievementId, a]))
  const achievements = allAchievements.map((a) => {
    const myAch = myAchMap.get(a.id)
    return {
      ...a,
      progress: myAch?.progress ?? 0,
      completed: myAch?.completed ?? false,
      unlockedAt: myAch?.unlockedAt ?? null,
    }
  })

  return NextResponse.json({
    totalXp,
    level,
    xpIntoLevel,
    xpForNext,
    progress,
    streak: user.streak,
    badges,
    achievements,
  })
}
