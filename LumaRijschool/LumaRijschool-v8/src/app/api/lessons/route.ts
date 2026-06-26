import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const lessons = await prisma.lesson.findMany({
    where: { isPublished: true },
    include: {
      topic: true,
      progress: { where: { userId: session.user.id } },
      _count: { select: { questions: true } },
    },
    orderBy: [{ topic: { order: 'asc' } }, { order: 'asc' }],
  })

  return NextResponse.json({ lessons })
}
