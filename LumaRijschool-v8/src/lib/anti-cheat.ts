/**
 * Anti-cheat detection for exams.
 */
import { prisma } from '@/lib/prisma'

export type CheatEventType = 'PAGE_LEAVE' | 'TAB_SWITCH' | 'FULLSCREEN_EXIT' | 'COPY_PASTE' | 'DEV_TOOLS' | 'WINDOW_BLUR'

export async function logCheatEvent({
  userId,
  attemptId,
  eventType,
  metadata,
  severity = 'LOW',
}: {
  userId: string
  attemptId?: string
  eventType: CheatEventType
  metadata?: string
  severity?: 'LOW' | 'MEDIUM' | 'HIGH'
}) {
  await prisma.antiCheatLog.create({
    data: { userId, attemptId, eventType, metadata, severity },
  })

  // High severity → flag the attempt
  if (severity === 'HIGH' && attemptId) {
    await prisma.examAttempt.update({
      where: { id: attemptId },
      data: { status: 'ABANDONED' },
    }).catch(() => {})
  }
}

export async function getAttemptCheatEvents(attemptId: string) {
  return prisma.antiCheatLog.findMany({
    where: { attemptId },
    orderBy: { createdAt: 'asc' },
  })
}

export async function shouldFlagAttempt(attemptId: string): Promise<boolean> {
  const count = await prisma.antiCheatLog.count({
    where: { attemptId, severity: { in: ['MEDIUM', 'HIGH'] } },
  })
  return count >= 3 // 3+ suspicious events = flag
}
