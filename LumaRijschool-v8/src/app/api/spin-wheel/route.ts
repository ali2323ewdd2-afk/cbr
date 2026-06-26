import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { awardXp } from '@/lib/gamification/engine'

// Spin the daily wheel — returns a random prize
const PRIZES = [
  { type: 'XP', value: 10, label: '+10 XP', chance: 0.35, color: '#94A3B8' },
  { type: 'XP', value: 25, label: '+25 XP', chance: 0.25, color: '#2563EB' },
  { type: 'XP', value: 50, label: '+50 XP', chance: 0.15, color: '#1FB871' },
  { type: 'XP', value: 100, label: '+100 XP', chance: 0.10, color: '#FFB020' },
  { type: 'BADGE', value: 0, label: 'Lucky Badge', chance: 0.05, color: '#7C5CFC' },
  { type: 'STREAK_FREEZE', value: 1, label: 'Streak Beschermer', chance: 0.07, color: '#FF6B6B' },
  { type: 'JACKPOT', value: 500, label: 'JACKPOT! +500 XP', chance: 0.03, color: '#FFD700' },
]

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check if user spun today
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayEnd = new Date(today)
  todayEnd.setDate(today.getDate() + 1)
  const alreadySpun = await prisma.spinWheelResult.findFirst({
    where: { userId: session.user.id, createdAt: { gte: today, lt: todayEnd } },
  })
  if (alreadySpun) {
    return NextResponse.json({ error: 'Je hebt vandaag al gedraaid', alreadySpun: true, prize: alreadySpun }, { status: 400 })
  }

  // Spin!
  const roll = Math.random()
  let cumulative = 0
  let won = PRIZES[0]
  for (const prize of PRIZES) {
    cumulative += prize.chance
    if (roll < cumulative) { won = prize; break }
  }

  // Apply prize
  if (won.type === 'XP' || won.type === 'JACKPOT') {
    await awardXp(session.user.id, won.value, 'SPIN_WHEEL')
  } else if (won.type === 'STREAK_FREEZE') {
    const streak = await prisma.streak.findUnique({ where: { userId: session.user.id } })
    if (streak) await prisma.streak.update({ where: { userId: session.user.id }, data: { current: streak.current + 1 } })
  }

  const result = await prisma.spinWheelResult.create({
    data: { userId: session.user.id, prize: won.type, value: won.value },
  })

  return NextResponse.json({ prize: won, result, canSpinAgain: false })
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayEnd = new Date(today)
  todayEnd.setDate(today.getDate() + 1)
  const spunToday = await prisma.spinWheelResult.findFirst({
    where: { userId: session.user.id, createdAt: { gte: today, lt: todayEnd } },
  })
  return NextResponse.json({ canSpin: !spunToday, lastSpin: spunToday, prizes: PRIZES })
}
