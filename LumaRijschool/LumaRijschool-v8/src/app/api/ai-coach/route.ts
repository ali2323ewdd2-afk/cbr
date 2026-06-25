import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { analyzeWeaknesses } from '@/lib/ai/weakness'
import { calculateReadiness } from '@/lib/gamification/engine'

// AI Coach: pass chance prediction + motivation + study pattern
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id
  const now = new Date()

  // Get readiness, weaknesses, recent activity
  const [readiness, weaknessData, streak, recentAttempts, lessonsCompleted, last7DaysActivity, examDate] = await Promise.all([
    calculateReadiness(userId),
    analyzeWeaknesses(userId),
    prisma.streak.findUnique({ where: { userId } }),
    prisma.examAttempt.findMany({
      where: { userId, status: 'COMPLETED' },
      orderBy: { finishedAt: 'desc' },
      take: 10,
      select: { score: true, passed: true, finishedAt: true, correctCount: true, totalQuestions: true },
    }),
    prisma.lessonProgress.count({ where: { userId, status: 'COMPLETED' } }),
    prisma.lessonProgress.findMany({
      where: { userId, completedAt: { gte: new Date(now.getTime() - 7 * 86400000) } },
      select: { completedAt: true },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { examDate: true, createdAt: true, lastLoginAt: true } }),
  ])

  // Study pattern analysis: most active time of day
  const lessonsAll = await prisma.lessonProgress.findMany({
    where: { userId },
    select: { completedAt: true },
  })
  const hourCounts: Record<number, number> = {}
  for (const l of lessonsAll) {
    if (!l.completedAt) continue
    const h = new Date(l.completedAt).getHours()
    hourCounts[h] = (hourCounts[h] ?? 0) + 1
  }
  const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]
  let studyPattern = 'onbekend'
  if (peakHour) {
    const h = parseInt(peakHour[0])
    if (h < 12) studyPattern = 'ochtend (08:00 - 12:00)'
    else if (h < 18) studyPattern = 'middag (12:00 - 18:00)'
    else studyPattern = 'avond (18:00 - 24:00)'
  }

  // Calculate pass chance
  const recentAvg = recentAttempts.length > 0
    ? recentAttempts.reduce((s, a) => s + a.score, 0) / recentAttempts.length
    : 0
  const lessonFactor = Math.min(1, lessonsCompleted / 12)
  const passChance = Math.min(0.99, Math.max(0, recentAvg * 0.7 + lessonFactor * 0.3))

  // Days until exam
  let daysUntilExam: number | null = null
  if (examDate?.examDate) {
    daysUntilExam = Math.max(0, Math.ceil((new Date(examDate.examDate).getTime() - now.getTime()) / 86400000))
  }

  // Inactivity check — if user inactive > 7 days, send motivation
  const lastActivity = streak?.lastActiveAt
  const daysSinceActivity = lastActivity ? Math.floor((now.getTime() - lastActivity.getTime()) / 86400000) : 999
  let motivationMessage: string | null = null
  if (daysSinceActivity >= 7) {
    const motivations = [
      `Welkom terug! Je bent al ${daysSinceActivity} dagen niet actief geweest. Maak vandaag 1 les om je momentum terug te krijgen. 🚀`,
      `Je streak is verbroken, maar je voortgang niet! Begin vandaag opnieuw — 5 minuten per dag is genoeg. 💪`,
      `Het echte CBR-examen wacht niet. Maar wij ook niet — kom vandaag terug en versla het! 🎯`,
    ]
    motivationMessage = motivations[Math.floor(Math.random() * motivations.length)]
  }

  // Recommendations
  const recommendations: string[] = []
  if (weaknessData.weaknesses.length > 0) {
    recommendations.push(`Focus op ${weaknessData.weaknesses[0].topicName} (accuracy ${weaknessData.weaknesses[0].accuracy}%)`)
  }
  if (lessonsCompleted < 6) {
    recommendations.push(`Voltooi nog ${6 - lessonsCompleted} lessen om je basis te versterken`)
  }
  if (recentAttempts.length < 3) {
    recommendations.push('Maak minimaal 3 examens om je slagingskans te verhogen')
  }
  if (daysUntilExam !== null && daysUntilExam < 14 && passChance < 0.85) {
    recommendations.push(`Je examen is over ${daysUntilExam} dagen — verhoog je studietijd!`)
  }
  if (recommendations.length === 0) {
    recommendations.push('Je bent op schema! Blijf consequent leren.')
  }

  // Save prediction
  await prisma.aICoachPrediction.create({
    data: {
      userId,
      passChance,
      studyStreakDays: streak?.current ?? 0,
      lastActivityDays: daysSinceActivity,
      weakTopics: JSON.stringify(weaknessData.weaknesses.map((w) => w.topicName)),
      recommendations: JSON.stringify(recommendations),
      motivationMessage,
    },
  }).catch(() => {})

  return NextResponse.json({
    passChance: Math.round(passChance * 100),
    readiness,
    studyPattern,
    studyStreakDays: streak?.current ?? 0,
    longestStreak: streak?.longest ?? 0,
    daysSinceActivity,
    daysUntilExam,
    lessonsCompleted,
    examsTaken: recentAttempts.length,
    recentAvgScore: Math.round(recentAvg * 100),
    weaknesses: weaknessData.weaknesses,
    recommendations,
    motivationMessage,
    examDate: examDate?.examDate,
  })
}
