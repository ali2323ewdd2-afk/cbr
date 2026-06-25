import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const attempt = await prisma.examAttempt.findUnique({ where: { id } })
  if (!attempt || attempt.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (attempt.status !== 'PAUSED') {
    return NextResponse.json({ error: 'Exam not paused' }, { status: 400 })
  }
  const updated = await prisma.examAttempt.update({
    where: { id },
    data: { status: 'IN_PROGRESS', resumedAt: new Date() },
  })
  return NextResponse.json({ attempt: updated })
}
