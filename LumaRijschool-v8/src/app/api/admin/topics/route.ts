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

const topicSchema = z.object({
  id: z.string().optional(),
  slug: z.string().trim().min(1).max(120).optional(),
  name: z.string().trim().min(1).max(160),
  nameEn: z.string().trim().max(160).optional().nullable(),
  color: z.string().trim().min(1).max(40).default('#2563EB'),
  iconKey: z.string().trim().max(80).optional().nullable(),
  imageUrl: z.string().trim().max(1000).optional().nullable(),
  order: z.coerce.number().int().min(0).default(0),
  description: z.string().trim().max(2000).optional().nullable(),
  isPublished: z.boolean().default(true),
})

const patchSchema = topicSchema.partial().extend({ id: z.string().min(1) })
const deleteSchema = z.object({ id: z.string().min(1) })

export async function GET(req: Request) {
  const session = await requireAdminSession()
  if (!session) return forbiddenResponse()

  try {
    const url = new URL(req.url)
    const { page, pageSize, skip } = parsePagination(url)
    const search = url.searchParams.get('search')?.trim()
    const published = url.searchParams.get('published')
    const where = {
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { slug: { contains: search, mode: 'insensitive' as const } },
              { description: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
      ...(published === 'true' || published === 'false' ? { isPublished: published === 'true' } : {}),
    }

    const [topics, total] = await Promise.all([
      prisma.topic.findMany({
        where,
        include: {
          _count: { select: { lessons: true, questions: true } },
        },
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: pageSize,
      }),
      prisma.topic.count({ where }),
    ])

    return NextResponse.json({ topics, total, page, pageSize })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

export async function POST(req: Request) {
  const session = await requireAdminSession()
  if (!session) return forbiddenResponse()

  const parsed = await readJson(req, topicSchema)
  if (parsed.error) return parsed.error

  try {
    const data = parsed.data
    const topic = await prisma.topic.create({
      data: {
        slug: data.slug ? slugify(data.slug) : slugify(data.name),
        name: data.name,
        nameEn: data.nameEn || null,
        color: data.color,
        iconKey: data.iconKey || null,
        imageUrl: data.imageUrl || null,
        order: data.order,
        description: data.description || null,
        isPublished: data.isPublished,
      },
    })
    return NextResponse.json({ topic }, { status: 201 })
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
    const topic = await prisma.topic.update({
      where: { id },
      data: {
        ...(data.slug !== undefined ? { slug: slugify(data.slug) } : {}),
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.nameEn !== undefined ? { nameEn: data.nameEn || null } : {}),
        ...(data.color !== undefined ? { color: data.color } : {}),
        ...(data.iconKey !== undefined ? { iconKey: data.iconKey || null } : {}),
        ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl || null } : {}),
        ...(data.order !== undefined ? { order: data.order } : {}),
        ...(data.description !== undefined ? { description: data.description || null } : {}),
        ...(data.isPublished !== undefined ? { isPublished: data.isPublished } : {}),
      },
    })
    return NextResponse.json({ topic })
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
  if (!parsed.data?.id) return badRequestResponse('Topic id is required')

  try {
    await prisma.topic.delete({ where: { id: parsed.data.id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return serverErrorResponse(error)
  }
}
