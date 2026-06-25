import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let settings = await prisma.notificationSetting.findUnique({ where: { userId: session.user.id } })
  if (!settings) {
    settings = await prisma.notificationSetting.create({ data: { userId: session.user.id } })
  }
  return NextResponse.json({ settings })
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const allowed = ['emailEnabled', 'pushEnabled', 'inAppEnabled', 'whatsappEnabled', 'telegramEnabled', 'quietHoursStart', 'quietHoursEnd', 'achievementAlerts', 'examReminders', 'streakWarnings', 'referralAlerts']
  const data: any = {}
  for (const k of allowed) {
    if (body[k] !== undefined) data[k] = body[k]
  }
  const settings = await prisma.notificationSetting.upsert({
    where: { userId: session.user.id },
    update: data,
    create: { userId: session.user.id, ...data },
  })
  return NextResponse.json({ settings })
}
