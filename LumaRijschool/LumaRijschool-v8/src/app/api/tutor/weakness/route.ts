import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { analyzeWeaknesses, generateCustomExam } from '@/lib/ai/weakness'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { action, topic, count, difficulty } = await req.json()

  if (action === 'weakness') {
    const result = await analyzeWeaknesses(session.user.id)
    return NextResponse.json(result)
  }
  if (action === 'generate-exam') {
    const result = await generateCustomExam({
      topic: topic || 'Voorrang',
      count: count || 20,
      difficulty: difficulty || 'MEDIUM',
      userId: session.user.id,
    })
    return NextResponse.json(result)
  }
  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
