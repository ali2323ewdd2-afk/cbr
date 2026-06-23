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
  slugify,
} from '@/lib/admin-api'

const examSchema = z.object({
  id: z.string().optional(),
  slug: z.string().trim().min(1).max(160).optional(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(5000),
  durationSec: z.coerce.number().int().min(60).default(2700),
  passingScore: z.coerce.number().min(0).max(1).default(0.875),
  questionCount: z.coerce.number().int().min(1).max(200).default(40),
  isFree: z.boolean().default(false),
  isPublished: z.boolean().default(false),
  type: z.enum(['PRACTICE', 'MOCK', 'OFFICIAL', 'REAL', 'CUSTOM']).default('MOCK'),
  tags: z.array(z.string().trim().min(1).max(80)).default([]),
  randomQuestions: z.boolean().default(false),
  questionIds: z.array(z.string().min(1)).default([]),
})

const patchSchema = examSchema.partial().extend({ id: z.string().min(1) })
const deleteSchema = z.object({ id: z.string().min(1) })

async function resolveQuestionIds(input: {
  randomQuestions?: boolean
  questionCount?: number
  questionIds?: string[]
}) {
  if (input.randomQuestions) {
    const candidates = await prisma.question.findMany({
      where: { isPublished: true },
      select: { id: true },
      orderBy: { createdAt: 'desc' },
      take: Math.max(input.questionCount ?? 40, 1),
    })
    return candidates.map((question) => question.id)
  }
  return input.questionIds ?? []
}

export async function GET(req: Request) {
  const session = await requireAdminSession()
  if (!session) return forbiddenResponse()

  try {
    const url = new URL(req.url)
    const { page, pageSize, skip } = parsePagination(url)
    const search = url.searchParams.get('search')?.trim()
    const type = url.searchParams.get('type')?.trim()
    const published = url.searchParams.get('published')
    const where = {
      ...(type ? { type } : {}),
      ...(published === 'true' || published === 'false' ? { isPublished: published === 'true' } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' as const } },
              { description: { contains: search, mode: 'insensitive' as const } },
              { slug: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    }

    const [exams, total] = await Promise.all([
      prisma.exam.findMany({
        where,
        include: {
          _count: { select: { questions: true, attempts: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.exam.count({ where }),
    ])

    return NextResponse.json({ exams, total, page, pageSize })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

export async function POST(req: Request) {
  const session = await requireAdminSession()
  if (!session) return forbiddenResponse()

  const parsed = await readJson(req, examSchema)
  if (parsed.error) return parsed.error

  try {
    const data = parsed.data
    const questionIds = await resolveQuestionIds(data)
    const exam = await prisma.$transaction(async (tx) => {
      const created = await tx.exam.create({
        data: {
          slug: data.slug ? slugify(data.slug) : slugify(data.title),
          title: data.title,
          description: data.description,
          durationSec: data.durationSec,
          passingScore: data.passingScore,
          questionCount: data.questionCount,
          isFree: data.isFree,
          isPublished: data.isPublished,
          type: data.type === 'OFFICIAL' ? 'REAL' : data.type,
          tags: JSON.stringify(data.tags),
        },
      })
      if (questionIds.length > 0) {
        await tx.examQuestion.createMany({
          data: questionIds.map((questionId, order) => ({ examId: created.id, questionId, order })),
          skipDuplicates: true,
        })
      }
      return created
    })
    return NextResponse.json({ exam }, { status: 201 })
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
    const { id, questionIds, randomQuestions, ...data } = parsed.data
    const resolvedQuestionIds = await resolveQuestionIds({
      randomQuestions,
      questionCount: data.questionCount,
      questionIds,
    })
    const exam = await prisma.$transaction(async (tx) => {
      const updated = await tx.exam.update({
        where: { id },
        data: {
          ...(data.slug !== undefined ? { slug: slugify(data.slug) } : {}),
          ...(data.title !== undefined ? { title: data.title } : {}),
          ...(data.description !== undefined ? { description: data.description } : {}),
          ...(data.durationSec !== undefined ? { durationSec: data.durationSec } : {}),
          ...(data.passingScore !== undefined ? { passingScore: data.passingScore } : {}),
          ...(data.questionCount !== undefined ? { questionCount: data.questionCount } : {}),
          ...(data.isFree !== undefined ? { isFree: data.isFree } : {}),
          ...(data.isPublished !== undefined ? { isPublished: data.isPublished } : {}),
          ...(data.type !== undefined ? { type: data.type === 'OFFICIAL' ? 'REAL' : data.type } : {}),
          ...(data.tags !== undefined ? { tags: JSON.stringify(data.tags) } : {}),
        },
      })
      if (questionIds !== undefined || randomQuestions) {
        await tx.examQuestion.deleteMany({ where: { examId: id } })
        if (resolvedQuestionIds.length > 0) {
          await tx.examQuestion.createMany({
            data: resolvedQuestionIds.map((questionId, order) => ({ examId: id, questionId, order })),
            skipDuplicates: true,
          })
        }
      }
      return updated
    })
    return NextResponse.json({ exam })
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
  if (!parsed.data?.id) return badRequestResponse('Exam id is required')

  try {
    await prisma.exam.delete({ where: { id: parsed.data.id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return serverErrorResponse(error)
  }
}
