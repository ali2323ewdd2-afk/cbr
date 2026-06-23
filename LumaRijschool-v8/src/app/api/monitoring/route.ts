import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redisHealth } from '@/lib/redis'

// /api/monitoring — Prometheus-style metrics + health checks (admin only)
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const start = Date.now()

  // DB metrics
  const [usersCount, activeSubs, examsTaken, lessonsCompleted, aiMessages, payments, refunds] = await Promise.all([
    prisma.user.count(),
    prisma.subscription.count({ where: { status: 'ACTIVE' } }),
    prisma.examAttempt.count({ where: { status: 'COMPLETED' } }),
    prisma.lessonProgress.count({ where: { status: 'COMPLETED' } }),
    prisma.tutorMessage.count(),
    prisma.payment.count({ where: { status: 'PAID' } }),
    prisma.refund.count({ where: { status: 'SUCCEEDED' } }),
  ])

  // DB latency
  const dbStart = Date.now()
  await prisma.$queryRaw`SELECT 1`
  const dbLatencyMs = Date.now() - dbStart

  // Redis
  const redis = await redisHealth()

  // Recent error count (audit log entries with ERROR action in last 24h)
  const since = new Date(Date.now() - 86400000)
  const recentErrors = await prisma.auditLog.count({
    where: { action: { contains: 'ERROR' }, createdAt: { gte: since } },
  })

  const uptimeSec = process.uptime()

  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.round(uptimeSec),
    response_time_ms: Date.now() - start,
    database: {
      latency_ms: dbLatencyMs,
      users: usersCount,
      active_subscriptions: activeSubs,
      exams_taken: examsTaken,
      lessons_completed: lessonsCompleted,
      ai_messages: aiMessages,
      payments: payments,
      refunds: refunds,
    },
    redis: {
      ok: redis.ok,
      latency_ms: redis.latencyMs ?? 0,
    },
    errors_24h: recentErrors,
    memory: {
      rss_mb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      heap_used_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      heap_total_mb: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
    },
  })
}
