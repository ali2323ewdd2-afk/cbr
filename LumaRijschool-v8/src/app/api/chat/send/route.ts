import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { publish } from '@/lib/redis'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { roomId, body, fileUrl, fileName, fileSize } = await req.json()
  if (!body && !fileUrl) return NextResponse.json({ error: 'Empty message' }, { status: 400 })

  // Verify membership
  const membership = await prisma.chatRoomMember.findUnique({
    where: { roomId_userId: { roomId, userId: session.user.id } },
  })
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const message = await prisma.chatMessage.create({
    data: { roomId, userId: session.user.id, authorType: 'USER', body: body || '', fileUrl, fileName, fileSize },
  })

  // Update room timestamp
  await prisma.chatRoom.update({ where: { id: roomId }, data: { updatedAt: new Date() } })

  // Broadcast via Redis → socket.io
  await publish('notifications:all', { type: 'CHAT_MESSAGE', roomId, message })

  return NextResponse.json({ message })
}
