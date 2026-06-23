import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify membership
  const membership = await prisma.chatRoomMember.findUnique({
    where: { roomId_userId: { roomId: id, userId: session.user.id } },
  })
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [room, messages] = await Promise.all([
    prisma.chatRoom.findUnique({
      where: { id },
      include: { members: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } } },
    }),
    prisma.chatMessage.findMany({
      where: { roomId: id },
      orderBy: { createdAt: 'asc' },
      take: 100,
    }),
  ])

  // Mark as read
  await prisma.chatRoomMember.update({
    where: { roomId_userId: { roomId: id, userId: session.user.id } },
    data: { lastReadAt: new Date() },
  })

  return NextResponse.json({ room, messages })
}
