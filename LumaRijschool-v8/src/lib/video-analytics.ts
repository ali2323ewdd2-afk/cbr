/**
 * Video analytics + bookmarks + per-timestamp notes.
 */
import { prisma } from '@/lib/prisma'

export async function trackVideoEvent({
  userId, lessonId, event, positionSec, durationSec,
}: {
  userId: string
  lessonId: string
  event: 'PLAY' | 'PAUSE' | 'SEEK' | 'ENDED' | 'DROP_OFF' | 'REWIND' | 'FORWARD'
  positionSec: number
  durationSec: number
}) {
  await prisma.videoAnalytics.create({
    data: { userId, lessonId, event, positionSec, durationSec },
  })
  // Update video progress
  await prisma.videoProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    update: { positionSec, durationSec, completed: event === 'ENDED' || positionSec >= durationSec - 5 },
    create: { userId, lessonId, positionSec, durationSec, completed: event === 'ENDED' },
  })
}

export async function getVideoAnalytics(userId: string, lessonId: string) {
  const [events, progress, bookmarks] = await Promise.all([
    prisma.videoAnalytics.findMany({
      where: { userId, lessonId },
      orderBy: { createdAt: 'asc' },
      take: 200,
    }),
    prisma.videoProgress.findUnique({ where: { userId_lessonId: { userId, lessonId } } }),
    prisma.bookmark.findMany({ where: { userId, lessonId }, orderBy: { positionSec: 'asc' } }),
  ])

  // Calculate metrics
  const playCount = events.filter((e) => e.event === 'PLAY').length
  const totalWatchSec = events.reduce((sum, e, i) => {
    if (e.event === 'PLAY') {
      const nextPause = events.slice(i + 1).find((x) => x.event === 'PAUSE' || x.event === 'ENDED' || x.event === 'DROP_OFF')
      if (nextPause) return sum + (nextPause.positionSec - e.positionSec)
    }
    return sum
  }, 0)
  const completionRate = progress?.durationSec ? Math.min(100, Math.round((progress.positionSec / progress.durationSec) * 100)) : 0
  const dropOffPoint = events.find((e) => e.event === 'DROP_OFF')?.positionSec

  return {
    playCount,
    totalWatchSec,
    completionRate,
    dropOffPoint,
    lastPosition: progress?.positionSec ?? 0,
    duration: progress?.durationSec ?? 0,
    bookmarks,
    completed: progress?.completed ?? false,
  }
}

export async function addBookmark(userId: string, lessonId: string, positionSec: number, label?: string) {
  return prisma.bookmark.create({
    data: { userId, lessonId, positionSec, label },
  })
}

export async function removeBookmark(bookmarkId: string, userId: string) {
  return prisma.bookmark.deleteMany({ where: { id: bookmarkId, userId } })
}
