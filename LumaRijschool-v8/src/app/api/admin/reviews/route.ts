import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import {
  badRequestResponse,
  forbiddenResponse,
  parsePagination,
  readJson,
  requireAdminSession,
  serverErrorResponse,
} from '@/lib/admin-api'

const patchSchema = z.object({
  id: z.string().min(1),
  action: z.enum(['APPROVE', 'REJECT', 'SHOW', 'HIDE']),
})
const deleteSchema = z.object({ id: z.string().min(1) })

export async function GET(req: Request) {
  const session = await requireAdminSession()
  if (!session) return forbiddenResponse()

  try {
    const url = new URL(req.url)
    const { page, pageSize, skip } = parsePagination(url)
    const search = url.searchParams.get('search')?.trim()
    const status = url.searchParams.get('status')?.trim()
    const where = {
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { review: { contains: search, mode: 'insensitive' as const } },
              { user: { name: { contains: search, mode: 'insensitive' as const } } },
              { user: { email: { contains: search, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    }

    const [reviews, total] = await Promise.all([
      prisma.lessonRating.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.lessonRating.count({ where }),
    ])
    const lessonIds = Array.from(new Set(reviews.map((review) => review.lessonId)))
    const lessons = await prisma.lesson.findMany({
      where: { id: { in: lessonIds } },
      select: { id: true, title: true },
    })
    const lessonMap = new Map(lessons.map((lesson) => [lesson.id, lesson]))

    return NextResponse.json({
      reviews: reviews.map((review) => ({ ...review, lesson: lessonMap.get(review.lessonId) ?? null })),
      total,
      page,
      pageSize,
    })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

export async function PATCH(req: Request) {
  const session = await requireAdminSession()
  if (!session) return forbiddenResponse()

  const parsed = await readJson(req, patchSchema)
  if (parsed.error) return parsed.error

  try {
    const review = await prisma.lessonRating.update({
      where: { id: parsed.data.id },
      data: parsed.data.action === 'APPROVE'
        ? { status: 'APPROVED', isVisible: true }
        : parsed.data.action === 'REJECT'
          ? { status: 'REJECTED', isVisible: false }
          : parsed.data.action === 'SHOW'
            ? { isVisible: true }
            : { isVisible: false },
    })
    return NextResponse.json({ review })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

export async function DELETE(req: Request) {
  const session = await requireAdminSession()
  if (!session) return forbiddenResponse()

  const id = new URL(req.url).searchParams.get('id')
  const parsed = id ? { data: { id }, error: null } : await readJson(req, deleteSchema)
  if (parsed.error) return parsed.error
  if (!parsed.data?.id) return badRequestResponse('Review id is required')

  try {
    await prisma.lessonRating.delete({ where: { id: parsed.data.id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return serverErrorResponse(error)
  }
}
