import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTotalXp, levelFromXp, calculateReadiness } from '@/lib/gamification/engine'
import { hasActiveSubscription } from '@/lib/payment/stripe'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      subscription: { include: { plan: true } },
      streak: true,
      badges: { include: { badge: true } },
      _count: {
        select: {
          examAttempts: { where: { status: 'COMPLETED' } },
          progress: { where: { status: 'COMPLETED' } },
        },
      },
    },
  })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const totalXp = await getTotalXp(user.id)
  const { level, xpIntoLevel, xpForNext, progress } = levelFromXp(totalXp)
  const readiness = await calculateReadiness(user.id)

  // Recent attempts
  const recentAttempts = await prisma.examAttempt.findMany({
    where: { userId: user.id, status: 'COMPLETED' },
    orderBy: { finishedAt: 'desc' },
    take: 5,
    include: { exam: true },
  })

  // Lessons progress summary
  const allLessons = await prisma.lesson.count({ where: { isPublished: true } })
  const completedLessons = await prisma.lessonProgress.count({
    where: { userId: user.id, status: 'COMPLETED' },
  })

  // Today's goal
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayEnd = new Date(today)
  todayEnd.setDate(today.getDate() + 1)
  const todayLessons = await prisma.lessonProgress.count({
    where: { userId: user.id, status: 'COMPLETED', completedAt: { gte: today, lt: todayEnd } },
  })
  const todayExams = await prisma.examAttempt.count({
    where: { userId: user.id, status: 'COMPLETED', finishedAt: { gte: today, lt: todayEnd } },
  })
  const todayAnswers = await prisma.answer.count({
    where: { userId: user.id, createdAt: { gte: today, lt: todayEnd } },
  })

  // Topic mastery (category scores)
  const categoryScores = await prisma.categoryScore.findMany({
    where: { userId: user.id },
    include: { topic: true },
  })

  // Active subscription check
  const hasSub = await hasActiveSubscription(user.id)
  let subInfo: any = null
  if (user.subscription) {
    subInfo = {
      plan: user.subscription.plan,
      status: user.subscription.status,
      expiresAt: user.subscription.expiresAt,
      daysLeft: Math.max(0, Math.ceil((user.subscription.expiresAt.getTime() - Date.now()) / 86400000)),
      autoRenew: user.subscription.autoRenew,
      isActive: hasSub,
    }
  }

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      studyGoal: user.studyGoal,
      examDate: user.examDate,
    },
    gamification: {
      totalXp,
      level,
      xpIntoLevel,
      xpForNext,
      progressToNext: progress,
      streak: user.streak?.current ?? 0,
      longestStreak: user.streak?.longest ?? 0,
      badges: user.badges.map((b) => b.badge),
      readiness,
    },
    stats: {
      completedLessons,
      totalLessons: allLessons,
      lessonsPct: allLessons > 0 ? completedLessons / allLessons : 0,
      examsTaken: user._count.examAttempts,
      todayLessons,
      todayExams,
      todayAnswers,
      todayXp: 0, // computed below
    },
    subscription: subInfo,
    recentAttempts,
    categoryScores,
  })
}
