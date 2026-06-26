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

// Recent activity feed for admin dashboard
export async function GET() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const since = new Date(Date.now() - 7 * 86400000)

  const [newUsers, newSubs, completedExams, perfectScores, payments] = await Promise.all([
    prisma.user.findMany({
      where: { role: 'STUDENT', createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, name: true, createdAt: true },
    }),
    prisma.subscription.findMany({
      where: { startedAt: { gte: since } },
      orderBy: { startedAt: 'desc' },
      take: 10,
      include: { user: { select: { name: true } }, plan: { select: { name: true } } },
    }),
    prisma.examAttempt.findMany({
      where: { status: 'COMPLETED', finishedAt: { gte: since } },
      orderBy: { finishedAt: 'desc' },
      take: 10,
      include: { user: { select: { name: true } }, exam: { select: { title: true } } },
    }),
    prisma.examAttempt.findMany({
      where: { status: 'COMPLETED', correctCount: { gte: 40 }, finishedAt: { gte: since } },
      orderBy: { finishedAt: 'desc' },
      take: 5,
      include: { user: { select: { name: true } } },
    }),
    prisma.payment.findMany({
      where: { status: 'PAID', createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { user: { select: { name: true } }, plan: { select: { name: true } } },
    }),
  ])

  // Combine into activity feed
  type Activity = { id: string; type: string; user: string; text: string; when: Date }
  const feed: Activity[] = []
  for (const u of newUsers) feed.push({ id: 'u-' + u.id, type: 'register', user: u.name ?? 'Gast', text: 'registreerde een account', when: u.createdAt })
  for (const s of newSubs) feed.push({ id: 's-' + s.id, type: 'subscribe', user: s.user.name ?? 'Gast', text: `nam ${s.plan.name}-abonnement`, when: s.startedAt })
  for (const e of completedExams) feed.push({ id: 'e-' + e.id, type: 'exam', user: e.user.name ?? 'Gast', text: `rondde "${e.exam.title}" af`, when: e.finishedAt! })
  for (const p of perfectScores) feed.push({ id: 'p-' + p.id, type: 'perfect', user: p.user.name ?? 'Gast', text: 'behaalde Perfect Score', when: p.finishedAt! })
  for (const p of payments) feed.push({ id: 'pay-' + p.id, type: 'payment', user: p.user.name ?? 'Gast', text: `betaalde €${(p.amountCents / 100).toFixed(2)} voor ${p.plan.name}`, when: p.createdAt })

  feed.sort((a, b) => b.when.getTime() - a.when.getTime())
  return NextResponse.json({ activity: feed.slice(0, 25) })
}
