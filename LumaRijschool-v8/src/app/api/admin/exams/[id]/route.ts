import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { forbiddenResponse, requireAdminSession, serverErrorResponse } from '@/lib/admin-api'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminSession()
  if (!session) return forbiddenResponse()

  try {
    const { id } = await params
    const [exam, stats] = await Promise.all([
      prisma.exam.findUnique({
        where: { id },
        include: {
          questions: {
            include: {
              question: {
                include: {
                  topic: { select: { id: true, name: true, color: true } },
                  options: { orderBy: { order: 'asc' } },
                },
              },
            },
            orderBy: { order: 'asc' },
          },
        },
      }),
      prisma.examAttempt.aggregate({
        where: { examId: id, status: 'COMPLETED' },
        _count: { id: true },
        _avg: { score: true, durationSec: true },
      }),
    ])
    if (!exam) return NextResponse.json({ error: 'Exam not found' }, { status: 404 })
    const passed = await prisma.examAttempt.count({ where: { examId: id, status: 'COMPLETED', passed: true } })
    return NextResponse.json({
      exam,
      stats: {
        attempts: stats._count.id,
        passRate: stats._count.id > 0 ? passed / stats._count.id : 0,
        averageScore: stats._avg.score ?? 0,
        averageDurationSec: stats._avg.durationSec ?? 0,
      },
    })
  } catch (error) {
    return serverErrorResponse(error)
  }
}
