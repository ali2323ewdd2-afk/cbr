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

  const sess = await prisma.tutorSession.findFirst({
    where: { id, userId: session.user.id },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  })
  if (!sess) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ session: sess })
}
