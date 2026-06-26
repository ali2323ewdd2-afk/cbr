import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { awardXp, updateStreak, checkProgressAchievements } from '@/lib/gamification/engine'
import { hasActiveSubscription } from '@/lib/payment/stripe'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { status, watchSec, positionSec, notesPrivate } = body

  const lesson = await prisma.lesson.findUnique({ where: { id }, select: { id: true, isFree: true, isPublished: true } })
  if (!lesson || !lesson.isPublished) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!lesson.isFree && !(await hasActiveSubscription(session.user.id))) {
    return NextResponse.json({ error: 'Subscription required' }, { status: 402 })
  }

  const existing = await prisma.lessonProgress.findUnique({
    where: { userId_lessonId: { userId: session.user.id, lessonId: id } },
  })

  let progress
  if (existing) {
    progress = await prisma.lessonProgress.update({
      where: { id: existing.id },
      data: {
        status: status ?? existing.status,
        watchSec: watchSec ?? existing.watchSec,
        positionSec: positionSec ?? existing.positionSec,
        notesPrivate: notesPrivate ?? existing.notesPrivate,
        completedAt: status === 'COMPLETED' ? new Date() : existing.completedAt,
      },
    })
  } else {
    progress = await prisma.lessonProgress.create({
      data: {
        userId: session.user.id,
        lessonId: id,
        status: status ?? 'IN_PROGRESS',
        watchSec: watchSec ?? 0,
        positionSec: positionSec ?? 0,
        notesPrivate,
        completedAt: status === 'COMPLETED' ? new Date() : null,
      },
    })
  }

  // Award XP when first completed
  if (status === 'COMPLETED' && (!existing || existing.status !== 'COMPLETED')) {
    await awardXp(session.user.id, 30, 'LESSON_COMPLETE', id)
    await updateStreak(session.user.id)
    await checkProgressAchievements(session.user.id)
  }

  return NextResponse.json({ progress })
}
