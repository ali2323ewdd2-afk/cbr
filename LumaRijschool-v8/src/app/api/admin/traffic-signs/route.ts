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

const signSchema = z.object({
  id: z.string().optional(),
  code: z.string().trim().min(1).max(40),
  name: z.string().trim().min(1).max(200),
  nameEn: z.string().trim().max(200).optional().nullable(),
  nameAr: z.string().trim().max(200).optional().nullable(),
  category: z.string().trim().min(1).max(80),
  imageUrl: z.string().trim().min(1).max(1000),
  description: z.string().trim().min(1).max(5000),
  descriptionEn: z.string().trim().max(5000).optional().nullable(),
  descriptionAr: z.string().trim().max(5000).optional().nullable(),
  isPublished: z.boolean().default(true),
})

const patchSchema = signSchema.partial().extend({ id: z.string().min(1) })
const deleteSchema = z.object({ id: z.string().min(1) })

export async function GET(req: Request) {
  const session = await requireAdminSession()
  if (!session) return forbiddenResponse()

  try {
    const url = new URL(req.url)
    const { page, pageSize, skip } = parsePagination(url)
    const search = url.searchParams.get('search')?.trim()
    const category = url.searchParams.get('category')?.trim()
    const published = url.searchParams.get('published')
    const where = {
      ...(category ? { category } : {}),
      ...(published === 'true' || published === 'false' ? { isPublished: published === 'true' } : {}),
      ...(search
        ? {
            OR: [
              { code: { contains: search, mode: 'insensitive' as const } },
              { name: { contains: search, mode: 'insensitive' as const } },
              { description: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    }

    const [trafficSigns, total] = await Promise.all([
      prisma.trafficSign.findMany({
        where,
        orderBy: [{ category: 'asc' }, { code: 'asc' }],
        skip,
        take: pageSize,
      }),
      prisma.trafficSign.count({ where }),
    ])

    return NextResponse.json({ trafficSigns, total, page, pageSize })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

export async function POST(req: Request) {
  const session = await requireAdminSession()
  if (!session) return forbiddenResponse()

  const parsed = await readJson(req, signSchema)
  if (parsed.error) return parsed.error

  try {
    const sign = await prisma.trafficSign.create({
      data: {
        code: parsed.data.code,
        name: parsed.data.name,
        nameEn: parsed.data.nameEn || null,
        nameAr: parsed.data.nameAr || null,
        category: parsed.data.category,
        imageUrl: parsed.data.imageUrl,
        description: parsed.data.description,
        descriptionEn: parsed.data.descriptionEn || null,
        descriptionAr: parsed.data.descriptionAr || null,
        isPublished: parsed.data.isPublished,
      },
    })
    return NextResponse.json({ trafficSign: sign }, { status: 201 })
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
    const sign = await prisma.trafficSign.update({
      where: { id },
      data: {
        ...(data.code !== undefined ? { code: data.code } : {}),
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.nameEn !== undefined ? { nameEn: data.nameEn || null } : {}),
        ...(data.nameAr !== undefined ? { nameAr: data.nameAr || null } : {}),
        ...(data.category !== undefined ? { category: data.category } : {}),
        ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.descriptionEn !== undefined ? { descriptionEn: data.descriptionEn || null } : {}),
        ...(data.descriptionAr !== undefined ? { descriptionAr: data.descriptionAr || null } : {}),
        ...(data.isPublished !== undefined ? { isPublished: data.isPublished } : {}),
      },
    })
    return NextResponse.json({ trafficSign: sign })
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
  if (!parsed.data?.id) return badRequestResponse('Traffic sign id is required')

  try {
    await prisma.trafficSign.delete({ where: { id: parsed.data.id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return serverErrorResponse(error)
  }
}
