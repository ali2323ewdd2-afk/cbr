import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { rating, review } = await req.json()
  if (!rating || rating < 1 || rating > 5) return NextResponse.json({ error: 'Invalid rating' }, { status: 400 })
  const r = await prisma.lessonRating.upsert({
    where: { userId_lessonId: { userId: session.user.id, lessonId: id } },
    update: { rating, review, status: 'PENDING', isVisible: true },
    create: { userId: session.user.id, lessonId: id, rating, review, status: 'PENDING', isVisible: true },
  })
  return NextResponse.json({ rating: r })
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ratings = await prisma.lessonRating.findMany({
    where: { lessonId: id, status: 'APPROVED', isVisible: true },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })
  const avg = ratings.length > 0 ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length : 0
  return NextResponse.json({ ratings, average: Math.round(avg * 10) / 10, count: ratings.length })
}
