import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTutorReply } from '@/lib/ai/tutor'

// Quick AI explanation for a lesson concept (used by "Leg dit uit met AI" button)
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { lessonId, questionId, text } = body as { lessonId?: string; questionId?: string; text: string }

  let context: string | undefined
  if (lessonId) {
    const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, include: { topic: true } })
    if (lesson) context = `Les: ${lesson.title} (onderwerp: ${lesson.topic.name}). ${lesson.summary}`
  } else if (questionId) {
    const q = await prisma.question.findUnique({ where: { id: questionId }, include: { topic: true, options: true } })
    if (q) context = `Vraag: ${q.stem}\nOnderwerp: ${q.topic.name}\nUitleg: ${q.explanation}`
  }

  const { reply } = await getTutorReply({
    messages: [{ role: 'user', content: text }],
    context,
  })

  return NextResponse.json({ reply })
}
