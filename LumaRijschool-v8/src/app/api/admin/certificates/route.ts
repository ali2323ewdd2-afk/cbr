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

const certificateSchema = z.object({
  id: z.string().optional(),
  userId: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(5000),
  score: z.coerce.number().min(0).max(1).optional().nullable(),
  courseId: z.string().trim().max(200).optional().nullable(),
  lessonId: z.string().trim().max(200).optional().nullable(),
  examAttemptId: z.string().trim().max(200).optional().nullable(),
  pdfUrl: z.string().trim().max(1000).optional().nullable(),
})

const patchSchema = certificateSchema.partial().extend({
  id: z.string().min(1),
  action: z.enum(['UPDATE', 'REISSUE']).default('UPDATE'),
})
const deleteSchema = z.object({ id: z.string().min(1) })

function certificateNumber() {
  return `LUMA-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`
}

export async function GET(req: Request) {
  const session = await requireAdminSession()
  if (!session) return forbiddenResponse()

  try {
    const url = new URL(req.url)
    const { page, pageSize, skip } = parsePagination(url)
    const search = url.searchParams.get('search')?.trim()
    const certificates = await prisma.certificate.findMany({
      orderBy: { issuedAt: 'desc' },
      skip,
      take: pageSize,
    })
    const userIds = Array.from(new Set(certificates.map((certificate) => certificate.userId)))
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds },
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' as const } },
                { email: { contains: search, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      select: { id: true, name: true, email: true },
    })
    const userMap = new Map(users.map((user) => [user.id, user]))
    const enriched = certificates
      .map((certificate) => ({ ...certificate, user: userMap.get(certificate.userId) ?? null }))
      .filter((certificate) => !search || certificate.user)
    const total = search ? enriched.length : await prisma.certificate.count()

    return NextResponse.json({ certificates: enriched, total, page, pageSize })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

export async function POST(req: Request) {
  const session = await requireAdminSession()
  if (!session) return forbiddenResponse()

  const parsed = await readJson(req, certificateSchema)
  if (parsed.error) return parsed.error

  try {
    const certificate = await prisma.certificate.create({
      data: {
        userId: parsed.data.userId,
        title: parsed.data.title,
        body: parsed.data.body,
        score: parsed.data.score ?? null,
        courseId: parsed.data.courseId || null,
        lessonId: parsed.data.lessonId || null,
        examAttemptId: parsed.data.examAttemptId || null,
        pdfUrl: parsed.data.pdfUrl || null,
        certificateNumber: certificateNumber(),
      },
    })
    return NextResponse.json({ certificate }, { status: 201 })
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
    const { id, action, ...data } = parsed.data
    const certificate = await prisma.certificate.update({
      where: { id },
      data: {
        ...(data.userId !== undefined ? { userId: data.userId } : {}),
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.body !== undefined ? { body: data.body } : {}),
        ...(data.score !== undefined ? { score: data.score ?? null } : {}),
        ...(data.courseId !== undefined ? { courseId: data.courseId || null } : {}),
        ...(data.lessonId !== undefined ? { lessonId: data.lessonId || null } : {}),
        ...(data.examAttemptId !== undefined ? { examAttemptId: data.examAttemptId || null } : {}),
        ...(data.pdfUrl !== undefined ? { pdfUrl: data.pdfUrl || null } : {}),
        ...(action === 'REISSUE' ? { issuedAt: new Date(), certificateNumber: certificateNumber() } : {}),
      },
    })
    return NextResponse.json({ certificate })
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
  if (!parsed.data?.id) return badRequestResponse('Certificate id is required')

  try {
    await prisma.certificate.delete({ where: { id: parsed.data.id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return serverErrorResponse(error)
  }
}
