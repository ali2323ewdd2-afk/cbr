import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateQuiz } from '@/lib/ai/tutor'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { topic, count, difficulty } = await req.json()
  const result = await generateQuiz({ topic: topic || 'Verkeersborden', count: count || 5, difficulty: difficulty || 'MEDIUM' })
  return NextResponse.json(result)
}
