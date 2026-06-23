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

const lessonSchema = z.object({
  id: z.string().optional(),
  slug: z.string().trim().min(1).max(160).optional(),
  title: z.string().trim().min(1).max(200),
  topicId: z.string().min(1),
  summary: z.string().trim().min(1).max(500),
  description: z.string().trim().min(1).max(5000),
  videoUrl: z.string().trim().max(1000).default(''),
  thumbnailUrl: z.string().trim().max(1000).optional().nullable(),
  durationSec: z.coerce.number().int().min(0).default(0),
  isFree: z.boolean().default(false),
  isPublished: z.boolean().default(true),
  order: z.coerce.number().int().min(0).default(0),
  transcript: z.string().trim().max(20000).optional().nullable(),
  notes: z.string().trim().max(20000).optional().nullable(),
  subtitleUrl: z.string().trim().max(1000).optional().nullable(),
})

const patchSchema = lessonSchema.partial().extend({ id: z.string().min(1) })
const deleteSchema = z.object({ id: z.string().min(1) })

export async function GET(req: Request) {
  const session = await requireAdminSession()
  if (!session) return forbiddenResponse()

  try {
    const url = new URL(req.url)
    const { page, pageSize, skip } = parsePagination(url)
    const search = url.searchParams.get('search')?.trim()
    const topicId = url.searchParams.get('topicId')?.trim()
    const paid = url.searchParams.get('paid')
    const published = url.searchParams.get('published')
    const where = {
      ...(topicId ? { topicId } : {}),
      ...(paid === 'free' ? { isFree: true } : paid === 'paid' ? { isFree: false } : {}),
      ...(published === 'true' || published === 'false' ? { isPublished: published === 'true' } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' as const } },
              { summary: { contains: search, mode: 'insensitive' as const } },
              { description: { contains: search, mode: 'insensitive' as const } },
              { slug: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    }

    const [lessons, total, topics] = await Promise.all([
      prisma.lesson.findMany({
        where,
        include: {
          topic: { select: { id: true, name: true, color: true } },
          _count: { select: { questions: true, progress: true, chapters: true } },
        },
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: pageSize,
      }),
      prisma.lesson.count({ where }),
      prisma.topic.findMany({ orderBy: [{ order: 'asc' }, { name: 'asc' }], select: { id: true, name: true } }),
    ])

    return NextResponse.json({ lessons, topics, total, page, pageSize })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

export async function POST(req: Request) {
  const session = await requireAdminSession()
  if (!session) return forbiddenResponse()

  const parsed = await readJson(req, lessonSchema)
  if (parsed.error) return parsed.error

  try {
    const data = parsed.data
    const lesson = await prisma.lesson.create({
      data: {
        slug: data.slug ? slugify(data.slug) : slugify(data.title),
        title: data.title,
        topicId: data.topicId,
        summary: data.summary,
        description: data.description,
        videoUrl: data.videoUrl,
        thumbnailUrl: data.thumbnailUrl || null,
        durationSec: data.durationSec,
        isFree: data.isFree,
        isPublished: data.isPublished,
        order: data.order,
        transcript: data.transcript || null,
        notes: data.notes || null,
        subtitleUrl: data.subtitleUrl || null,
      },
    })
    return NextResponse.json({ lesson }, { status: 201 })
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
    const { id, ...data } = parsed.data
    const lesson = await prisma.lesson.update({
      where: { id },
      data: {
        ...(data.slug !== undefined ? { slug: slugify(data.slug) } : {}),
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.topicId !== undefined ? { topicId: data.topicId } : {}),
        ...(data.summary !== undefined ? { summary: data.summary } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.videoUrl !== undefined ? { videoUrl: data.videoUrl } : {}),
        ...(data.thumbnailUrl !== undefined ? { thumbnailUrl: data.thumbnailUrl || null } : {}),
        ...(data.durationSec !== undefined ? { durationSec: data.durationSec } : {}),
        ...(data.isFree !== undefined ? { isFree: data.isFree } : {}),
        ...(data.isPublished !== undefined ? { isPublished: data.isPublished } : {}),
        ...(data.order !== undefined ? { order: data.order } : {}),
        ...(data.transcript !== undefined ? { transcript: data.transcript || null } : {}),
        ...(data.notes !== undefined ? { notes: data.notes || null } : {}),
        ...(data.subtitleUrl !== undefined ? { subtitleUrl: data.subtitleUrl || null } : {}),
      },
    })
    return NextResponse.json({ lesson })
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
  if (!parsed.data?.id) return badRequestResponse('Lesson id is required')

  try {
    await prisma.lesson.delete({ where: { id: parsed.data.id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return serverErrorResponse(error)
  }
}
