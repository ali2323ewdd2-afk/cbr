import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasActiveSubscription } from '@/lib/payment/stripe'

// Retry only wrong questions from a previous attempt — creates a new custom exam
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const hasSub = await hasActiveSubscription(session.user.id)
  if (!hasSub) return NextResponse.json({ error: 'Subscription required' }, { status: 402 })

  const parentAttempt = await prisma.examAttempt.findUnique({
    where: { id },
    include: { answers: { include: { question: true } }, exam: true },
  })
  if (!parentAttempt || parentAttempt.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Get all wrong answers
  const wrongAnswers = parentAttempt.answers.filter((a) => !a.isCorrect)
  if (wrongAnswers.length === 0) {
    return NextResponse.json({ error: 'Geen foute vragen om te herhalen' }, { status: 400 })
  }

  // Create a custom exam
  const customExam = await prisma.exam.create({
    data: {
      slug: `retry-${parentAttempt.id}-${Date.now()}`,
      title: `Herhaling foute vragen · ${parentAttempt.exam.title}`,
      description: `Custom examen met ${wrongAnswers.length} foute vragen uit je vorige poging.`,
      durationSec: Math.max(900, wrongAnswers.length * 60),
      passingScore: 0.875,
      questionCount: wrongAnswers.length,
      isFree: false,
      isPublished: true,
      type: 'CUSTOM',
      tags: JSON.stringify(['RETRY']),
    },
  })

  for (let i = 0; i < wrongAnswers.length; i++) {
    await prisma.examQuestion.create({
      data: { examId: customExam.id, questionId: wrongAnswers[i].questionId, order: i + 1 },
    })
  }

  // Start attempt
  const attempt = await prisma.examAttempt.create({
    data: {
      userId: session.user.id,
      examId: customExam.id,
      totalQuestions: wrongAnswers.length,
      status: 'IN_PROGRESS',
      isRetry: true,
      parentAttemptId: parentAttempt.id,
    },
  })

  return NextResponse.json({ examId: customExam.id, attemptId: attempt.id })
}
