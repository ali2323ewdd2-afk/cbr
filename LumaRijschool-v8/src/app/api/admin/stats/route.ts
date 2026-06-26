import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPPORT')) {
    return null
  }
  return session
}

export async function GET() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - 7)

  const [
    totalUsers,
    activeSubscriptions,
    guestsToday,
    passedThisWeek,
    totalRevenue,
    monthlyRevenue,
    revenueByMonth,
    lessonsCompleted,
    examsTaken,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'STUDENT' } }),
    prisma.subscription.count({ where: { status: 'ACTIVE', expiresAt: { gte: now } } }),
    prisma.guest.count({
      where: { createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) } },
    }),
    prisma.examAttempt.count({
      where: { status: 'COMPLETED', passed: true, finishedAt: { gte: startOfWeek } },
    }),
    prisma.payment.aggregate({ where: { status: 'PAID' }, _sum: { amountCents: true } }),
    prisma.payment.aggregate({
      where: { status: 'PAID', createdAt: { gte: startOfMonth },
      },
      _sum: { amountCents: true },
    }),
    // revenue by month (last 12 months)
    (async () => {
      const payments = await prisma.payment.findMany({
        where: { status: 'PAID', createdAt: { gte: new Date(now.getFullYear() - 1, now.getMonth(), 1) } },
        select: { amountCents: true, createdAt: true },
      })
      const map: Record<string, number> = {}
      for (const p of payments) {
        const key = `${p.createdAt.getFullYear()}-${String(p.createdAt.getMonth() + 1).padStart(2, '0')}`
        map[key] = (map[key] ?? 0) + p.amountCents
      }
      return Object.entries(map).map(([month, cents]) => ({ month, cents })).sort((a, b) => a.month.localeCompare(b.month))
    })(),
    prisma.lessonProgress.count({ where: { status: 'COMPLETED' } }),
    prisma.examAttempt.count({ where: { status: 'COMPLETED' } }),
  ])

  // Pass rate
  const attemptsThisWeek = await prisma.examAttempt.count({ where: { status: 'COMPLETED', finishedAt: { gte: startOfWeek } } })
  const passRate = attemptsThisWeek > 0 ? Math.round((passedThisWeek / attemptsThisWeek) * 100) : 0

  // Subscription conversion
  const conversionRate = totalUsers > 0 ? Math.round((activeSubscriptions / totalUsers) * 100) : 0

  return NextResponse.json({
    totals: {
      totalUsers,
      activeSubscriptions,
      guestsToday,
      passedThisWeek,
      totalRevenueCents: totalRevenue._sum.amountCents ?? 0,
      monthlyRevenueCents: monthlyRevenue._sum.amountCents ?? 0,
      lessonsCompleted,
      examsTaken,
      passRate,
      conversionRate,
    },
    revenueByMonth,
  })
}
