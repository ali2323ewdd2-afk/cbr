import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      country: true,
      role: true,
      studyGoal: true,
      dailyGoalMin: true,
      examDate: true,
      avatarUrl: true,
      createdAt: true,
    },
  })
  return NextResponse.json({ user })
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const allowed = ['name', 'phone', 'avatarUrl', 'studyGoal', 'dailyGoalMin', 'examDate', 'country']
  const data: any = {}
  for (const k of allowed) {
    if (body[k] !== undefined) data[k] = body[k]
  }
  if (data.examDate) data.examDate = new Date(data.examDate)

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data,
    select: { id: true, email: true, name: true, phone: true, studyGoal: true, dailyGoalMin: true, examDate: true },
  })
  return NextResponse.json({ user })
}
