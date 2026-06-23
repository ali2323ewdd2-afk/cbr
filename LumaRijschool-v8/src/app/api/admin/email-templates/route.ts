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

const templateSchema = z.object({
  id: z.string().optional(),
  slug: z.string().trim().min(1).max(120).optional(),
  name: z.string().trim().min(1).max(160),
  subject: z.string().trim().min(1).max(200),
  html: z.string().trim().min(1).max(100_000),
  description: z.string().trim().max(2000).optional().nullable(),
  isActive: z.boolean().default(true),
})

const patchSchema = templateSchema.partial().extend({ id: z.string().min(1) })
const deleteSchema = z.object({ id: z.string().min(1) })

export async function GET(req: Request) {
  const session = await requireAdminSession()
  if (!session) return forbiddenResponse()
  try {
    const url = new URL(req.url)
    const { page, pageSize, skip } = parsePagination(url)
    const search = url.searchParams.get('search')?.trim()
    const where = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { subject: { contains: search, mode: 'insensitive' as const } },
        { slug: { contains: search, mode: 'insensitive' as const } },
      ],
    } : {}
    const [templates, total] = await Promise.all([
      prisma.emailTemplate.findMany({ where, orderBy: { updatedAt: 'desc' }, skip, take: pageSize }),
      prisma.emailTemplate.count({ where }),
    ])
    return NextResponse.json({ templates, total, page, pageSize })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

export async function POST(req: Request) {
  const session = await requireAdminSession()
  if (!session) return forbiddenResponse()
  const parsed = await readJson(req, templateSchema)
  if (parsed.error) return parsed.error
  try {
    const template = await prisma.emailTemplate.create({
      data: {
        slug: parsed.data.slug ? slugify(parsed.data.slug) : slugify(parsed.data.name),
        name: parsed.data.name,
        subject: parsed.data.subject,
        html: parsed.data.html,
        description: parsed.data.description || null,
        isActive: parsed.data.isActive,
      },
    })
    return NextResponse.json({ template }, { status: 201 })
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
    const template = await prisma.emailTemplate.update({
      where: { id },
      data: {
        ...(data.slug !== undefined ? { slug: slugify(data.slug) } : {}),
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.subject !== undefined ? { subject: data.subject } : {}),
        ...(data.html !== undefined ? { html: data.html } : {}),
        ...(data.description !== undefined ? { description: data.description || null } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    })
    return NextResponse.json({ template })
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
  if (!parsed.data?.id) return badRequestResponse('Template id is required')
  try {
    await prisma.emailTemplate.update({ where: { id: parsed.data.id }, data: { isActive: false } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return serverErrorResponse(error)
  }
}
