import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { forbiddenResponse, requireAdminSession, serverErrorResponse } from '@/lib/admin-api'

export async function GET() {
  const session = await requireAdminSession()
  if (!session) return forbiddenResponse()

  try {
    const [events, progress] = await Promise.all([
      prisma.videoAnalytics.groupBy({
        by: ['lessonId', 'event'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 200,
      }),
      prisma.videoProgress.groupBy({
        by: ['lessonId'],
        _count: { id: true },
        _avg: { positionSec: true, durationSec: true },
      }),
    ])
    const lessonIds = Array.from(new Set([...events.map((event) => event.lessonId), ...progress.map((item) => item.lessonId)]))
    const lessons = await prisma.lesson.findMany({
      where: { id: { in: lessonIds } },
      select: { id: true, title: true, durationSec: true },
    })
    const lessonMap = new Map(lessons.map((lesson) => [lesson.id, lesson]))
    const eventMap = new Map<string, Record<string, number>>()
    for (const event of events) {
      const current = eventMap.get(event.lessonId) ?? {}
      current[event.event] = event._count.id
      eventMap.set(event.lessonId, current)
    }
    return NextResponse.json({
      videos: progress.map((item) => {
        const lesson = lessonMap.get(item.lessonId)
        const averageDuration = item._avg.durationSec || lesson?.durationSec || 0
        return {
          lessonId: item.lessonId,
          title: lesson?.title ?? item.lessonId,
          viewers: item._count.id,
          averagePositionSec: item._avg.positionSec ?? 0,
          averageDurationSec: averageDuration,
          completionRate: averageDuration > 0 ? Math.min(1, (item._avg.positionSec ?? 0) / averageDuration) : 0,
          events: eventMap.get(item.lessonId) ?? {},
        }
      }),
    })
  } catch (error) {
    return serverErrorResponse(error)
  }
}
