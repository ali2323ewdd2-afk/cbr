import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPPORT')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const totalSessions = await prisma.tutorSession.count()
  const totalMessages = await prisma.tutorMessage.count()
  const totalTokensIn = await prisma.tutorMessage.aggregate({ _sum: { tokensIn: true } })
  const totalTokensOut = await prisma.tutorMessage.aggregate({ _sum: { tokensOut: true } })

  // AI usage by day (last 14 days)
  const since = new Date(Date.now() - 14 * 86400000)
  const messages = await prisma.tutorMessage.findMany({
    where: { createdAt: { gte: since }, role: 'USER' },
    select: { createdAt: true, tokensIn: true, tokensOut: true },
  })
  const byDay: Record<string, { messages: number; tokensIn: number; tokensOut: number }> = {}
  for (const m of messages) {
    const day = m.createdAt.toISOString().slice(0, 10)
    if (!byDay[day]) byDay[day] = { messages: 0, tokensIn: 0, tokensOut: 0 }
    byDay[day].messages++
    byDay[day].tokensIn += m.tokensIn
    byDay[day].tokensOut += m.tokensOut
  }
  const trend = Object.entries(byDay).map(([day, v]) => ({ day, ...v })).sort((a, b) => a.day.localeCompare(b.day))

  // Top users by message count
  const topUsers = await prisma.tutorMessage.groupBy({
    by: ['sessionId'],
    where: { role: 'USER' },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 10,
  })
  const sessionIds = topUsers.map((t) => t.sessionId)
  const sessions = await prisma.tutorSession.findMany({
    where: { id: { in: sessionIds } },
    select: { id: true, userId: true, title: true, user: { select: { name: true } } },
  })
  const topByUser = topUsers.map((t) => {
    const s = sessions.find((x) => x.id === t.sessionId)
    return {
      sessionId: t.sessionId,
      title: s?.title,
      userName: s?.user.name ?? 'Anoniem',
      messages: t._count.id,
    }
  })

  return NextResponse.json({
    totalSessions,
    totalMessages,
    totalTokensIn: totalTokensIn._sum.tokensIn ?? 0,
    totalTokensOut: totalTokensOut._sum.tokensOut ?? 0,
    trend,
    topUsers: topByUser,
  })
}
