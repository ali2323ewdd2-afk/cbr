import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Generate or fetch the user's AI-powered study plan based on exam date + goal
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let plan = await prisma.studyPlan.findUnique({
    where: { userId: session.user.id },
    include: { days: { orderBy: { date: 'asc' } } },
  })

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Auto-generate a 14-day plan based on exam date or fallback
  if (!plan) {
    const examDate = user.examDate ?? new Date(Date.now() + 14 * 86400000)
    const dailyMinutes = user.dailyGoalMin ?? 30
    const questionsPerDay = 15
    const examsPerWeek = 2

    plan = await prisma.studyPlan.create({
      data: {
        userId: user.id,
        examDate,
        dailyMinutes,
        questionsPerDay,
        examsPerWeek,
        days: {
          create: generateDays(examDate, dailyMinutes, questionsPerDay, examsPerWeek),
        },
      },
      include: { days: { orderBy: { date: 'asc' } } },
    })
  }

  return NextResponse.json({ plan, user })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { examDate, dailyMinutes, questionsPerDay, examsPerWeek } = body

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      examDate: examDate ? new Date(examDate) : undefined,
      dailyGoalMin: dailyMinutes,
    },
  })

  // Recreate plan days
  const existing = await prisma.studyPlan.findUnique({ where: { userId: session.user.id } })
  if (existing) {
    await prisma.planDay.deleteMany({ where: { planId: existing.id } })
    await prisma.studyPlan.update({
      where: { id: existing.id },
      data: {
        examDate: examDate ? new Date(examDate) : existing.examDate,
        dailyMinutes: dailyMinutes ?? existing.dailyMinutes,
        questionsPerDay: questionsPerDay ?? existing.questionsPerDay,
        examsPerWeek: examsPerWeek ?? existing.examsPerWeek,
        days: { create: generateDays(examDate ? new Date(examDate) : existing.examDate, dailyMinutes ?? existing.dailyMinutes, questionsPerDay ?? existing.questionsPerDay, examsPerWeek ?? existing.examsPerWeek) },
      },
    })
    const refreshed = await prisma.studyPlan.findUnique({
      where: { userId: session.user.id },
      include: { days: { orderBy: { date: 'asc' } } },
    })
    return NextResponse.json({ plan: refreshed, user })
  }

  const newPlan = await prisma.studyPlan.create({
    data: {
      userId: session.user.id,
      examDate: examDate ? new Date(examDate) : new Date(Date.now() + 14 * 86400000),
      dailyMinutes: dailyMinutes ?? 30,
      questionsPerDay: questionsPerDay ?? 15,
      examsPerWeek: examsPerWeek ?? 2,
      days: { create: generateDays(examDate ? new Date(examDate) : new Date(Date.now() + 14 * 86400000), dailyMinutes ?? 30, questionsPerDay ?? 15, examsPerWeek ?? 2) },
    },
    include: { days: { orderBy: { date: 'asc' } } },
  })

  return NextResponse.json({ plan: newPlan, user })
}

function generateDays(examDate: Date, dailyMinutes: number, questionsPerDay: number, examsPerWeek: number) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const exam = new Date(examDate)
  exam.setHours(0, 0, 0, 0)

  const days: any[] = []
  const totalDays = Math.max(7, Math.min(56, Math.round((exam.getTime() - today.getTime()) / 86400000)))
  let examCounter = 0
  for (let i = 0; i < totalDays; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)
    const dayOfWeek = date.getDay() // 0 sun .. 6 sat
    const isRest = dayOfWeek === 0 // Sunday rest
    const weekday = date.toLocaleDateString('nl-NL', { weekday: 'short' }).replace('.', '')
    const dayNum = date.getDate()
    let title: string
    let lessonsGoal = 0, qGoal = 0, examGoal = 0
    if (isRest) {
      title = 'Rustdag 😌'
    } else if (i % 7 === 6) {
      // weekly mock exam
      title = 'Mock exam'
      examGoal = 1
      examCounter++
    } else if (i % 3 === 2) {
      title = 'Fouten herhalen'
      qGoal = questionsPerDay
    } else {
      title = `${Math.max(1, Math.round(dailyMinutes / 15))} lessen · ${questionsPerDay} vragen`
      lessonsGoal = Math.max(1, Math.round(dailyMinutes / 15))
      qGoal = questionsPerDay
    }
    days.push({
      date,
      title,
      lessonsGoal,
      questionsGoal: qGoal,
      examGoal,
      isRest,
    })
  }
  return days
}
