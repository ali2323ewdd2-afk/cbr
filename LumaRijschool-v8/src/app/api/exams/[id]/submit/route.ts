import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  awardXp,
  updateStreak,
  checkProgressAchievements,
  updateCategoryScore,
  calculateReadiness,
} from '@/lib/gamification/engine'
import { generateCertificatePdf } from '@/lib/certificate-pdf'

interface SubmitAnswer {
  examQuestionId: string
  selectedKeys: string[]
  timeMs?: number
  marked?: boolean
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { attemptId, answers, durationSec } = body as {
    attemptId: string
    answers: SubmitAnswer[]
    durationSec: number
  }

  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    include: { exam: { include: { questions: { include: { question: { include: { options: true, topic: true } } } } } } },
  })
  if (!attempt || attempt.userId !== session.user.id || attempt.examId !== id) {
    return NextResponse.json({ error: 'Invalid attempt' }, { status: 400 })
  }
  if (attempt.status === 'COMPLETED') {
    return NextResponse.json({ attempt, alreadyCompleted: true })
  }

  let correct = 0
  const categoryBreakdown: Record<string, { correct: number; total: number; topicId: string; color: string }> = {}

  for (const ans of answers) {
    const eq = attempt.exam.questions.find((q) => q.id === ans.examQuestionId)
    if (!eq) continue
    const correctKeys = eq.question.options.filter((o) => o.isCorrect).map((o) => o.key).sort()
    const selectedSorted = [...ans.selectedKeys].sort()
    const isCorrect = JSON.stringify(correctKeys) === JSON.stringify(selectedSorted)
    if (isCorrect) correct++

    // Save answer
    await prisma.answer.create({
      data: {
        userId: session.user.id,
        questionId: eq.question.id,
        attemptId: attempt.id,
        selectedKeys: JSON.stringify(ans.selectedKeys),
        isCorrect,
        timeMs: ans.timeMs ?? 0,
        marked: ans.marked ?? false,
      },
    })

    // Update category
    const tName = eq.question.topic.name
    const tId = eq.question.topic.id
    const tColor = eq.question.topic.color
    if (!categoryBreakdown[tName]) categoryBreakdown[tName] = { correct: 0, total: 0, topicId: tId, color: tColor }
    categoryBreakdown[tName].correct += isCorrect ? 1 : 0
    categoryBreakdown[tName].total += 1

    // Update DB category score
    await updateCategoryScore(session.user.id, tId, isCorrect)
  }

  const total = attempt.exam.questions.length
  const score = total > 0 ? correct / total : 0
  const passed = score >= attempt.exam.passingScore
  const isPerfect = correct === total
  const isFast = durationSec > 0 && durationSec <= 900

  // XP logic
  let xpAwarded = 0
  if (passed) {
    xpAwarded += 90
    if (isPerfect) xpAwarded += 200
    if (isFast) xpAwarded += 100
    await awardXp(session.user.id, xpAwarded, isPerfect ? 'PERFECT_SCORE' : 'EXAM_PASS', attempt.id)
  } else {
    xpAwarded += 20
    await awardXp(session.user.id, 20, 'EXAM_ATTEMPT', attempt.id)
  }

  // Calculate readiness delta
  const previousReadiness = await calculateReadiness(session.user.id)
  const updated = await prisma.examAttempt.update({
    where: { id: attempt.id },
    data: {
      status: 'COMPLETED',
      finishedAt: new Date(),
      durationSec,
      score,
      correctCount: correct,
      totalQuestions: total,
      passed,
      xpAwarded,
      readinessDelta: previousReadiness,
    },
  })

  await updateStreak(session.user.id)
  await checkProgressAchievements(session.user.id)

  if (passed) {
    const existingCertificate = await prisma.certificate.findFirst({ where: { examAttemptId: attempt.id } })
    if (!existingCertificate) {
      const certificateNumber = `LUMA-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`
      const title = `Certificate voor ${attempt.exam.title}`
      const body = `Geslaagd met ${Math.round(score * 100)}% voor ${attempt.exam.title}.`
      const pdfUrl = await generateCertificatePdf({ certificateNumber, title, body, issuedAt: new Date() }).catch(() => null)
      await prisma.certificate.create({
        data: {
          userId: session.user.id,
          examAttemptId: attempt.id,
          title,
          body,
          score,
          certificateNumber,
          pdfUrl,
        },
      }).catch(() => null)
    }
  }

  // Notification
  await prisma.notification.create({
    data: {
      userId: session.user.id,
      type: 'EXAM_READY',
      title: passed ? `Geslaagd! +${xpAwarded} XP 🎉` : `Examen afgerond · +${xpAwarded} XP`,
      body: isPerfect ? 'Perfecte score, geen fouten!' : passed ? 'Je bent klaar voor het echte examen.' : 'Bekijk je fouten en probeer opnieuw.',
      link: `/results/${attempt.id}`,
    },
  }).catch(() => {})

  return NextResponse.json({
    attempt: updated,
    correct,
    total,
    score,
    passed,
    isPerfect,
    isFast,
    xpAwarded,
    categoryBreakdown,
  })
}
