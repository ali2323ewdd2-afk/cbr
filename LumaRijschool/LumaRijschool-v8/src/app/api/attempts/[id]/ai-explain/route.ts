import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTutorReply } from '@/lib/ai/tutor'

// AI explanation of a wrong answer in an attempt
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { answerId } = await req.json()
  if (!answerId) return NextResponse.json({ error: 'answerId required' }, { status: 400 })

  const { prisma } = await import('@/lib/prisma')
  const answer = await prisma.answer.findUnique({
    where: { id: answerId },
    include: { question: { include: { topic: true, options: true } } },
  })
  if (!answer) return NextResponse.json({ error: 'Answer not found' }, { status: 404 })

  const correctKeys = answer.question.options.filter((o) => o.isCorrect).map((o) => o.key).join(',')
  // selectedKeys can be string (SQLite) or string[] (PostgreSQL)
  const userKeys: string = Array.isArray(answer.selectedKeys) ? answer.selectedKeys.join(',') : answer.selectedKeys
  const { reply } = await getTutorReply({
    messages: [
      {
        role: 'user',
        content: `Ik had deze vraag fout bij het CBR theorie-examen:\n\nVraag: ${answer.question.stem}\nMijn antwoord: ${userKeys}\nJuiste antwoord: ${correctKeys}\nOnderwerp: ${answer.question.topic.name}\n\nWaarom is het juiste antwoord juist? Geef een korte, duidelijke uitleg.`,
      },
    ],
  })
  return NextResponse.json({ reply })
}
