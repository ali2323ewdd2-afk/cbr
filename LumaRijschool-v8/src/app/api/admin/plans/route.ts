import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import {
  badRequestResponse,
  forbiddenResponse,
  parsePagination,
  readJson,
  requireAdminOnlySession,
  requireAdminSession,
  serverErrorResponse,
  slugify,
} from '@/lib/admin-api'

const planSchema = z.object({
  id: z.string().optional(),
  slug: z.string().trim().min(1).max(120).optional(),
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(2000),
  priceCents: z.coerce.number().int().min(0),
  currency: z.string().trim().min(3).max(3).default('EUR'),
  durationDays: z.coerce.number().int().min(1).max(3650),
  stripePriceId: z.string().trim().max(200).optional().nullable(),
  features: z.string().trim().min(2).max(10000).default('[]'),
  isPopular: z.boolean().default(false),
  isActive: z.boolean().default(true),
})

const patchSchema = planSchema.partial().extend({ id: z.string().min(1) })
const deleteSchema = z.object({ id: z.string().min(1) })

export async function GET(req: Request) {
  const session = await requireAdminSession()
  if (!session) return forbiddenResponse()

  try {
    const url = new URL(req.url)
    const { page, pageSize, skip } = parsePagination(url)
    const search = url.searchParams.get('search')?.trim()
    const active = url.searchParams.get('active')
    const where = {
      ...(active === 'true' || active === 'false' ? { isActive: active === 'true' } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { slug: { contains: search, mode: 'insensitive' as const } },
              { description: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    }
    const [plans, total] = await Promise.all([
      prisma.plan.findMany({
        where,
        include: { _count: { select: { subscriptions: true, payments: true } } },
        orderBy: [{ isActive: 'desc' }, { priceCents: 'asc' }],
        skip,
        take: pageSize,
      }),
      prisma.plan.count({ where }),
    ])
    return NextResponse.json({ plans, total, page, pageSize })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

export async function POST(req: Request) {
  const session = await requireAdminOnlySession()
  if (!session) return forbiddenResponse()

  const parsed = await readJson(req, planSchema)
  if (parsed.error) return parsed.error

  try {
    JSON.parse(parsed.data.features)
    const plan = await prisma.plan.create({
      data: {
        slug: parsed.data.slug ? slugify(parsed.data.slug) : slugify(parsed.data.name),
        name: parsed.data.name,
        description: parsed.data.description,
        priceCents: parsed.data.priceCents,
        currency: parsed.data.currency.toUpperCase(),
        durationDays: parsed.data.durationDays,
        stripePriceId: parsed.data.stripePriceId || null,
        features: parsed.data.features,
        isPopular: parsed.data.isPopular,
        isActive: parsed.data.isActive,
      },
    })
    return NextResponse.json({ plan }, { status: 201 })
  } catch (error) {
    if (error instanceof SyntaxError) return badRequestResponse('Features must be valid JSON')
    return serverErrorResponse(error)
  }
}

export async function PATCH(req: Request) {
  const session = await requireAdminOnlySession()
  if (!session) return forbiddenResponse()

  const parsed = await readJson(req, patchSchema)
  if (parsed.error) return parsed.error

  try {
    const { id, ...data } = parsed.data
    if (data.features !== undefined) JSON.parse(data.features)
    const plan = await prisma.plan.update({
      where: { id },
      data: {
        ...(data.slug !== undefined ? { slug: slugify(data.slug) } : {}),
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.priceCents !== undefined ? { priceCents: data.priceCents } : {}),
        ...(data.currency !== undefined ? { currency: data.currency.toUpperCase() } : {}),
        ...(data.durationDays !== undefined ? { durationDays: data.durationDays } : {}),
        ...(data.stripePriceId !== undefined ? { stripePriceId: data.stripePriceId || null } : {}),
        ...(data.features !== undefined ? { features: data.features } : {}),
        ...(data.isPopular !== undefined ? { isPopular: data.isPopular } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    })
    return NextResponse.json({ plan })
  } catch (error) {
    if (error instanceof SyntaxError) return badRequestResponse('Features must be valid JSON')
    return serverErrorResponse(error)
  }
}

export async function DELETE(req: Request) {
  const session = await requireAdminOnlySession()
  if (!session) return forbiddenResponse()

  const id = new URL(req.url).searchParams.get('id')
  const parsed = id ? { data: { id }, error: null } : await readJson(req, deleteSchema)
  if (parsed.error) return parsed.error
  if (!parsed.data?.id) return badRequestResponse('Plan id is required')

  try {
    const usage = await prisma.plan.findUnique({
      where: { id: parsed.data.id },
      include: { _count: { select: { subscriptions: true, payments: true } } },
    })
    if (!usage) return badRequestResponse('Plan not found')
    if (usage._count.subscriptions > 0 || usage._count.payments > 0) {
      const plan = await prisma.plan.update({ where: { id: parsed.data.id }, data: { isActive: false } })
      return NextResponse.json({ plan, softDeleted: true })
    }
    await prisma.plan.delete({ where: { id: parsed.data.id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return serverErrorResponse(error)
  }
}
