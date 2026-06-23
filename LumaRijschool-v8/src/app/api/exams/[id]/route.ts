import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasActiveSubscription } from '@/lib/payment/stripe'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const exam = await prisma.exam.findUnique({
    where: { id },
    include: {
      questions: {
        include: { question: { include: { options: true, topic: true } } },
        orderBy: { order: 'asc' },
      },
    },
  })
  if (!exam || !exam.isPublished) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const hasAccess = exam.isFree || (await hasActiveSubscription(session.user.id))
  if (!hasAccess) return NextResponse.json({ error: 'Subscription required' }, { status: 402 })

  // Strip correct flags from options (sent only on submit)
  const safe = {
    ...exam,
    questions: exam.questions.map((eq) => ({
      id: eq.id,
      order: eq.order,
      question: {
        id: eq.question.id,
        stem: eq.question.stem,
        imageUrl: eq.question.imageUrl,
        scenarioText: eq.question.scenarioText,
        topic: { id: eq.question.topic.id, name: eq.question.topic.name, color: eq.question.topic.color },
        options: eq.question.options.map((o) => ({ id: o.id, key: o.key, text: o.text })),
      },
    })),
  }

  return NextResponse.json({ exam: safe })
}
