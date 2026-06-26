import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const lesson = await prisma.lesson.findUnique({
    where: { id },
    include: {
      topic: true,
      chapters: { orderBy: { order: 'asc' } },
      questions: {
        include: { options: true },
        orderBy: { createdAt: 'asc' },
      },
      progress: { where: { userId: session.user.id } },
    },
  })
  if (!lesson || !lesson.isPublished) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Free lessons are accessible. Paid lessons require active subscription.
  const hasAccess = lesson.isFree || (await hasActiveSubscription(session.user.id))
  if (!hasAccess) {
    return NextResponse.json({ error: 'Subscription required', lesson: { id: lesson.id, title: lesson.title, isFree: false } }, { status: 402 })
  }

  return NextResponse.json({ lesson, hasAccess: true })
}

// Local import to avoid circular
async function hasActiveSubscription(userId: string) {
  const sub = await prisma.subscription.findUnique({ where: { userId } })
  if (!sub) return false
  if (sub.status !== 'ACTIVE') return false
  if (sub.expiresAt < new Date()) {
    await prisma.subscription.update({ where: { id: sub.id }, data: { status: 'EXPIRED' } })
    return false
  }
  return true
}
