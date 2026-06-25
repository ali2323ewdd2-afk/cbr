import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasActiveSubscription } from '@/lib/payment/stripe'

export async function GET() {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  const isAuthed = !!userId

  const exams = await prisma.exam.findMany({
    where: { isPublished: true },
    include: {
      _count: { select: { questions: true } },
      attempts: userId ? { where: { userId }, orderBy: { startedAt: 'desc' }, take: 1 } : false,
    },
    orderBy: { createdAt: 'asc' },
  })

  // Filter: free exams for guests, all exams for authed users with subscription
  let filtered = exams.filter((e) => e.isFree)
  if (isAuthed) {
    const hasSub = await hasActiveSubscription(userId)
    if (hasSub) filtered = exams
  }

  return NextResponse.json({ exams: filtered })
}
