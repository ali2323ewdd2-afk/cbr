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

const optionSchema = z.object({
  key: z.string().trim().min(1).max(8),
  text: z.string().trim().min(1).max(1000),
  isCorrect: z.boolean().default(false),
  order: z.coerce.number().int().min(0).default(0),
})

const questionSchema = z.object({
  id: z.string().optional(),
  topicId: z.string().min(1),
  lessonId: z.string().min(1).optional().nullable(),
  type: z.string().trim().min(1).max(40).default('SINGLE'),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).default('MEDIUM'),
  stem: z.string().trim().min(1).max(5000),
  scenarioText: z.string().trim().max(5000).optional().nullable(),
  imageUrl: z.string().trim().max(1000).optional().nullable(),
  videoUrl: z.string().trim().max(1000).optional().nullable(),
  explanation: z.string().trim().min(1).max(5000),
  isFree: z.boolean().default(false),
  isPublished: z.boolean().default(true),
  tags: z.array(z.string().trim().min(1).max(80)).default([]),
  options: z.array(optionSchema).length(4, 'Question must have exactly 4 options'),
})

const bulkQuestionSchema = z.object({
  mode: z.literal('bulk'),
  questions: z.array(questionSchema).min(1).max(200),
})

const createSchema = z.union([questionSchema, bulkQuestionSchema])
const patchSchema = questionSchema.partial().extend({
  id: z.string().min(1),
  options: z.array(optionSchema).length(4).optional(),
})
const deleteSchema = z.object({
  id: z.string().min(1).optional(),
  ids: z.array(z.string().min(1)).optional(),
}).refine((data) => data.id || (data.ids && data.ids.length > 0), 'Question id is required')

export async function GET(req: Request) {
  const session = await requireAdminSession()
  if (!session) return forbiddenResponse()

  try {
    const url = new URL(req.url)
    const { page, pageSize, skip } = parsePagination(url, { pageSize: 50, maxPageSize: 100 })
    const search = url.searchParams.get('search')?.trim()
    const topicId = url.searchParams.get('topicId')?.trim()
    const difficulty = url.searchParams.get('difficulty')?.trim()
    const published = url.searchParams.get('published')
    const where = {
      ...(topicId ? { topicId } : {}),
      ...(difficulty ? { difficulty } : {}),
      ...(published === 'true' || published === 'false' ? { isPublished: published === 'true' } : {}),
      ...(search
        ? {
            OR: [
              { stem: { contains: search, mode: 'insensitive' as const } },
              { explanation: { contains: search, mode: 'insensitive' as const } },
              { tags: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    }

    const [questions, total, topics, lessons] = await Promise.all([
      prisma.question.findMany({
        where,
        include: {
          topic: true,
          lesson: { select: { id: true, title: true } },
          options: { orderBy: { order: 'asc' } },
          _count: { select: { answers: true, examLinks: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.question.count({ where }),
      prisma.topic.findMany({ orderBy: [{ order: 'asc' }, { name: 'asc' }], select: { id: true, name: true } }),
      prisma.lesson.findMany({ orderBy: [{ order: 'asc' }, { title: 'asc' }], select: { id: true, title: true } }),
    ])

    return NextResponse.json({ questions, topics, lessons, total, page, pageSize })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

export async function POST(req: Request) {
  const session = await requireAdminSession()
  if (!session) return forbiddenResponse()

  const parsed = await readJson(req, createSchema)
  if (parsed.error) return parsed.error

  try {
    if ('mode' in parsed.data) {
      const created = await prisma.$transaction(
        parsed.data.questions.map((question) =>
          prisma.question.create({
            data: {
              topicId: question.topicId,
              lessonId: question.lessonId || null,
              type: question.type,
              difficulty: question.difficulty,
              stem: question.stem,
              scenarioText: question.scenarioText || null,
              imageUrl: question.imageUrl || null,
              videoUrl: question.videoUrl || null,
              explanation: question.explanation,
              isFree: question.isFree,
              isPublished: question.isPublished,
              tags: JSON.stringify(question.tags),
              options: {
                create: question.options.map((option, index) => ({
                  key: option.key,
                  text: option.text,
                  isCorrect: option.isCorrect,
                  order: option.order || index,
                })),
              },
            },
          }),
        ),
      )
      return NextResponse.json({ questions: created, count: created.length }, { status: 201 })
    }

    const question = await prisma.question.create({
      data: {
        topicId: parsed.data.topicId,
        lessonId: parsed.data.lessonId || null,
        type: parsed.data.type,
        difficulty: parsed.data.difficulty,
        stem: parsed.data.stem,
        scenarioText: parsed.data.scenarioText || null,
        imageUrl: parsed.data.imageUrl || null,
        videoUrl: parsed.data.videoUrl || null,
        explanation: parsed.data.explanation,
        isFree: parsed.data.isFree,
        isPublished: parsed.data.isPublished,
        tags: JSON.stringify(parsed.data.tags),
        options: {
          create: parsed.data.options.map((option, index) => ({
            key: option.key,
            text: option.text,
            isCorrect: option.isCorrect,
            order: option.order || index,
          })),
        },
      },
      include: { options: true, topic: true },
    })
    return NextResponse.json({ question }, { status: 201 })
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
    const { id, options, tags, ...data } = parsed.data
    const question = await prisma.$transaction(async (tx) => {
      const updated = await tx.question.update({
        where: { id },
        data: {
          ...(data.topicId !== undefined ? { topicId: data.topicId } : {}),
          ...(data.lessonId !== undefined ? { lessonId: data.lessonId || null } : {}),
          ...(data.type !== undefined ? { type: data.type } : {}),
          ...(data.difficulty !== undefined ? { difficulty: data.difficulty } : {}),
          ...(data.stem !== undefined ? { stem: data.stem } : {}),
          ...(data.scenarioText !== undefined ? { scenarioText: data.scenarioText || null } : {}),
          ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl || null } : {}),
          ...(data.videoUrl !== undefined ? { videoUrl: data.videoUrl || null } : {}),
          ...(data.explanation !== undefined ? { explanation: data.explanation } : {}),
          ...(data.isFree !== undefined ? { isFree: data.isFree } : {}),
          ...(data.isPublished !== undefined ? { isPublished: data.isPublished } : {}),
          ...(tags !== undefined ? { tags: JSON.stringify(tags) } : {}),
        },
      })
      if (options) {
        await tx.questionOption.deleteMany({ where: { questionId: id } })
        await tx.questionOption.createMany({
          data: options.map((option, index) => ({
            questionId: id,
            key: option.key,
            text: option.text,
            isCorrect: option.isCorrect,
            order: option.order || index,
          })),
        })
      }
      return updated
    })
    return NextResponse.json({ question })
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
  const ids = parsed.data?.ids ?? (parsed.data?.id ? [parsed.data.id] : [])
  if (ids.length === 0) return badRequestResponse('Question id is required')

  try {
    await prisma.question.deleteMany({ where: { id: { in: ids } } })
    return NextResponse.json({ ok: true, deleted: ids.length })
  } catch (error) {
    return serverErrorResponse(error)
  }
}
