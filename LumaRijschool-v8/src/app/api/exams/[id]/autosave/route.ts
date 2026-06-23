import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Auto-save answers during exam (without submitting)
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { attemptId, answers } = await req.json()

  const attempt = await prisma.examAttempt.findUnique({ where: { id: attemptId } })
  if (!attempt || attempt.userId !== session.user.id || attempt.examId !== id) {
    return NextResponse.json({ error: 'Invalid attempt' }, { status: 400 })
  }

  // Update each answer (upsert)
  for (const ans of answers) {
    const selectedKeysStr = Array.isArray(ans.selectedKeys) ? JSON.stringify(ans.selectedKeys) : ans.selectedKeys
    const existing = await prisma.answer.findFirst({
      where: { attemptId, questionId: ans.questionId },
    })
    if (existing) {
      await prisma.answer.update({
        where: { id: existing.id },
        data: {
          selectedKeys: selectedKeysStr,
          marked: ans.marked ?? existing.marked,
          flagged: ans.flagged ?? existing.flagged,
          hotspotAnswer: ans.hotspotAnswer,
          dragDropAnswer: ans.dragDropAnswer,
        },
      })
    } else {
      await prisma.answer.create({
        data: {
          userId: session.user.id,
          questionId: ans.questionId,
          attemptId,
          selectedKeys: selectedKeysStr,
          marked: ans.marked ?? false,
          flagged: ans.flagged ?? false,
          hotspotAnswer: ans.hotspotAnswer,
          dragDropAnswer: ans.dragDropAnswer,
        },
      })
    }
  }

  return NextResponse.json({ ok: true, savedAt: new Date() })
}
