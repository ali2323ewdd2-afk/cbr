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

const videoBaseSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional().nullable(),
  youtubeUrl: z.string().trim().max(1000).optional().nullable(),
  mp4Url: z.string().trim().max(1000).optional().nullable(),
  thumbnailUrl: z.string().trim().max(1000).optional().nullable(),
  durationSec: z.coerce.number().int().min(0).default(0),
  isPublished: z.boolean().default(false),
})

const videoSchema = videoBaseSchema.refine((data) => data.youtubeUrl || data.mp4Url, 'Youtube URL or MP4 URL is required')
const patchSchema = videoBaseSchema.partial().extend({ id: z.string().min(1) })
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
      ...(published === 'true' || published === 'false' ? { isPublished: published === 'true' } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' as const } },
              { description: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    }

    const [videos, total] = await Promise.all([
      prisma.adminVideo.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: pageSize }),
      prisma.adminVideo.count({ where }),
    ])

    return NextResponse.json({ videos, total, page, pageSize })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

export async function POST(req: Request) {
  const session = await requireAdminSession()
  if (!session) return forbiddenResponse()

  const parsed = await readJson(req, videoSchema)
  if (parsed.error) return parsed.error

  try {
    const video = await prisma.adminVideo.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description || null,
        youtubeUrl: parsed.data.youtubeUrl || null,
        mp4Url: parsed.data.mp4Url || null,
        thumbnailUrl: parsed.data.thumbnailUrl || null,
        durationSec: parsed.data.durationSec,
        isPublished: parsed.data.isPublished,
      },
    })
    return NextResponse.json({ video }, { status: 201 })
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
    const video = await prisma.adminVideo.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.description !== undefined ? { description: data.description || null } : {}),
        ...(data.youtubeUrl !== undefined ? { youtubeUrl: data.youtubeUrl || null } : {}),
        ...(data.mp4Url !== undefined ? { mp4Url: data.mp4Url || null } : {}),
        ...(data.thumbnailUrl !== undefined ? { thumbnailUrl: data.thumbnailUrl || null } : {}),
        ...(data.durationSec !== undefined ? { durationSec: data.durationSec } : {}),
        ...(data.isPublished !== undefined ? { isPublished: data.isPublished } : {}),
      },
    })
    return NextResponse.json({ video })
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
  if (!parsed.data?.id) return badRequestResponse('Video id is required')

  try {
    await prisma.adminVideo.delete({ where: { id: parsed.data.id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return serverErrorResponse(error)
  }
}
