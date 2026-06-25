import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasActiveSubscription } from '@/lib/payment/stripe'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const exam = await prisma.exam.findUnique({ where: { id } })
  if (!exam) return NextResponse.json({ error: 'Exam not found' }, { status: 404 })

  const hasAccess = exam.isFree || (await hasActiveSubscription(session.user.id))
  if (!hasAccess) return NextResponse.json({ error: 'Subscription required' }, { status: 402 })

  // Don't allow more than 1 in-progress attempt
  const inProgress = await prisma.examAttempt.findFirst({
    where: { userId: session.user.id, examId: id, status: 'IN_PROGRESS' },
  })
  if (inProgress) return NextResponse.json({ attempt: inProgress })

  const attempt = await prisma.examAttempt.create({
    data: { userId: session.user.id, examId: id, totalQuestions: exam.questionCount },
  })

  return NextResponse.json({ attempt })
}
