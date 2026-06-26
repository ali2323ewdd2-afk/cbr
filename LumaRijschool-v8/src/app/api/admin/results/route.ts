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

const deleteSchema = z.object({ id: z.string().min(1) })

export async function GET(req: Request) {
  const session = await requireAdminSession()
  if (!session) return forbiddenResponse()

  try {
    const url = new URL(req.url)
    const id = url.searchParams.get('id')?.trim()
    if (id) {
      const result = await prisma.examAttempt.findUnique({
        where: { id },
        include: {
          user: { select: { id: true, name: true, email: true } },
          exam: { select: { id: true, title: true, passingScore: true, type: true } },
          answers: {
            include: {
              question: {
                include: {
                  topic: { select: { id: true, name: true, color: true } },
                  options: { orderBy: { order: 'asc' } },
                },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      })
      if (!result) return badRequestResponse('Result not found')
      return NextResponse.json({ result })
    }

    const { page, pageSize, skip } = parsePagination(url)
    const search = url.searchParams.get('search')?.trim()
    const status = url.searchParams.get('status')?.trim()
    const passed = url.searchParams.get('passed')
    const where = {
      ...(status ? { status } : { status: 'COMPLETED' }),
      ...(passed === 'true' || passed === 'false' ? { passed: passed === 'true' } : {}),
      ...(search
        ? {
            OR: [
              { user: { name: { contains: search, mode: 'insensitive' as const } } },
              { user: { email: { contains: search, mode: 'insensitive' as const } } },
              { exam: { title: { contains: search, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    }

    const [results, total] = await Promise.all([
      prisma.examAttempt.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          exam: { select: { id: true, title: true, passingScore: true, type: true } },
          _count: { select: { answers: true } },
        },
        orderBy: [{ finishedAt: 'desc' }, { startedAt: 'desc' }],
        skip,
        take: pageSize,
      }),
      prisma.examAttempt.count({ where }),
    ])

    return NextResponse.json({ results, total, page, pageSize })
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
  if (!parsed.data?.id) return badRequestResponse('Result id is required')

  try {
    await prisma.examAttempt.delete({ where: { id: parsed.data.id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return serverErrorResponse(error)
  }
}
