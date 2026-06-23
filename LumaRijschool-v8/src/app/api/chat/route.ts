import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTutorReply } from '@/lib/ai/tutor'
import { publish } from '@/lib/redis'

// List user's chat rooms
export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const type = url.searchParams.get('type') // 'support' | 'group' | 'direct'

  // Get rooms the user is a member of
  const memberships = await prisma.chatRoomMember.findMany({
    where: { userId: session.user.id },
    include: {
      room: {
        include: {
          members: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
          _count: { select: { messages: true } },
        },
      },
    },
    orderBy: { room: { updatedAt: 'desc' } },
  })

  let rooms = memberships.map((m) => m.room)
  if (type) rooms = rooms.filter((r) => r.type === type.toUpperCase())

  // Get last message per room
  const roomsWithLast = await Promise.all(
    rooms.map(async (r) => {
      const lastMsg = await prisma.chatMessage.findFirst({
        where: { roomId: r.id },
        orderBy: { createdAt: 'desc' },
      })
      return { ...r, lastMessage: lastMsg }
    }),
  )

  return NextResponse.json({ rooms: roomsWithLast })
}

// Create or join a chat room
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { type, subject, recipientId } = await req.json()

  // For SUPPORT chat — create a new support chat room with AI first reply
  if (type === 'SUPPORT') {
    const room = await prisma.chatRoom.create({
      data: {
        type: 'SUPPORT',
        name: subject || 'Support',
        isPrivate: true,
        createdBy: session.user.id,
        members: { create: [{ userId: session.user.id, role: 'MEMBER' }] },
      },
      include: { members: true },
    })

    // AI first reply
    const aiReply = await getTutorReply({
      messages: [
        {
          role: 'user',
          content: `Een student opent een support chat met onderwerp: "${subject}". Geef een korte, behulpzame begroeting in het Nederlands en vraag wat ze nodig hebben.`,
        },
      ],
    })

    const aiMessage = await prisma.chatMessage.create({
      data: {
        roomId: room.id,
        authorType: 'AI',
        body: aiReply.reply,
      },
    })

    await prisma.liveChatSession.create({
      data: { userId: session.user.id, roomId: room.id, status: 'OPEN', subject, aiFirstReply: aiReply.reply },
    }).catch(() => {})

    await publish('notifications:user', { userId: session.user.id, type: 'CHAT', roomId: room.id, message: aiMessage })

    return NextResponse.json({ room, aiMessage })
  }

  // For DIRECT chat between two users
  if (type === 'DIRECT' && recipientId) {
    // Check if room already exists
    const existing = await prisma.chatRoom.findFirst({
      where: { type: 'DIRECT', isPrivate: true, members: { every: { userId: { in: [session.user.id, recipientId] } } } },
      include: { members: true },
    })
    if (existing && existing.members.length === 2) {
      return NextResponse.json({ room: existing })
    }
    const room = await prisma.chatRoom.create({
      data: {
        type: 'DIRECT',
        isPrivate: true,
        members: { create: [{ userId: session.user.id, role: 'MEMBER' }, { userId: recipientId, role: 'MEMBER' }] },
      },
      include: { members: true },
    })
    return NextResponse.json({ room })
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
}
