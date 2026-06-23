import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const comments = await prisma.lessonComment.findMany({
    where: { lessonId: id, isHidden: false },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
  })
  return NextResponse.json({ comments })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { body, parentCommentId } = await req.json()
  if (!body?.trim()) return NextResponse.json({ error: 'Body required' }, { status: 400 })
  const comment = await prisma.lessonComment.create({
    data: { userId: session.user.id, lessonId: id, body, parentCommentId },
  })
  return NextResponse.json({ comment })
}
