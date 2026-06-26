import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const attempt = await prisma.examAttempt.findUnique({
    where: { id },
    include: {
      exam: true,
      answers: {
        include: {
          question: {
            include: {
              topic: true,
              options: true,
            },
          },
        },
      },
    },
  })

  if (!attempt) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (attempt.userId !== session.user.id && (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({ attempt })
}
