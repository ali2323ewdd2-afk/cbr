import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { trackVideoEvent, getVideoAnalytics, addBookmark, removeBookmark } from '@/lib/video-analytics'
import { prisma } from '@/lib/prisma'
import { hasActiveSubscription } from '@/lib/payment/stripe'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  if (body.lessonId) {
    const lesson = await prisma.lesson.findUnique({ where: { id: body.lessonId }, select: { isFree: true, isPublished: true } })
    if (!lesson || !lesson.isPublished) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!lesson.isFree && !(await hasActiveSubscription(session.user.id))) {
      return NextResponse.json({ error: 'Subscription required' }, { status: 402 })
    }
  }
  if (body.action === 'bookmark') {
    const bm = await addBookmark(session.user.id, body.lessonId, body.positionSec, body.label)
    return NextResponse.json({ bookmark: bm })
  }
  if (body.action === 'remove-bookmark') {
    await removeBookmark(body.bookmarkId, session.user.id)
    return NextResponse.json({ ok: true })
  }
  await trackVideoEvent({
    userId: session.user.id,
    lessonId: body.lessonId,
    event: body.event,
    positionSec: body.positionSec,
    durationSec: body.durationSec,
  })
  return NextResponse.json({ ok: true })
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const url = new URL(req.url)
  const lessonId = url.searchParams.get('lessonId')!
  if (!lessonId) return NextResponse.json({ error: 'lessonId required' }, { status: 400 })
  const analytics = await getVideoAnalytics(session.user.id, lessonId)
  return NextResponse.json(analytics)
}
