import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import {
  badRequestResponse,
  forbiddenResponse,
  readJson,
  requireAdminOnlySession,
  requireAdminSession,
  serverErrorResponse,
} from '@/lib/admin-api'

const patchSchema = z.object({
  action: z.enum(['BAN', 'UNBAN', 'DISABLE', 'ENABLE', 'DELETE', 'EXTEND_SUB', 'UPDATE_PROFILE', 'CHANGE_PASSWORD', 'CHANGE_ROLE']).optional(),
  name: z.string().trim().max(160).optional().nullable(),
  email: z.string().email().optional(),
  phone: z.string().trim().max(40).optional().nullable(),
  password: z.string().min(8).max(200).optional(),
  role: z.enum(['STUDENT', 'SUPPORT', 'ADMIN']).optional(),
})

const safeUserSelect = {
  id: true,
  email: true,
  name: true,
  phone: true,
  role: true,
  country: true,
  device: true,
  avatarUrl: true,
  examDate: true,
  studyGoal: true,
  dailyGoalMin: true,
  emailVerified: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
  lastLoginIp: true,
  banned: true,
  referralCode: true,
  referredById: true,
} as const

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const session = await requireAdminSession()
  if (!session) return forbiddenResponse()

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        ...safeUserSelect,
        subscription: { include: { plan: true } },
        payments: { include: { plan: true }, orderBy: { createdAt: 'desc' }, take: 20 },
        examAttempts: { include: { exam: true }, orderBy: { startedAt: 'desc' }, take: 20 },
        progress: { include: { lesson: true }, orderBy: { updatedAt: 'desc' }, take: 20 },
        xpEvents: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    })
    if (!user) return badRequestResponse('User not found')
    return NextResponse.json({ user })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const session = await requireAdminSession()
  if (!session) return forbiddenResponse()

  const parsed = await readJson(req, patchSchema)
  if (parsed.error) return parsed.error
  const action = parsed.data.action

  try {
    if (action === 'BAN' || action === 'DISABLE') {
      const user = await prisma.user.update({ where: { id }, data: { banned: true }, select: safeUserSelect })
      await prisma.auditLog.create({
        data: { actorId: session.user.id, action: 'USER_BANNED', entity: 'User', entityId: id },
      })
      return NextResponse.json({ user })
    }
    if (action === 'UNBAN' || action === 'ENABLE') {
      const user = await prisma.user.update({ where: { id }, data: { banned: false }, select: safeUserSelect })
      await prisma.auditLog.create({
        data: { actorId: session.user.id, action: 'USER_UNBANNED', entity: 'User', entityId: id },
      })
      return NextResponse.json({ user })
    }
    if (action === 'EXTEND_SUB') {
      const sub = await prisma.subscription.findUnique({ where: { userId: id } })
      if (sub) {
        const newExpiry = new Date(sub.expiresAt)
        newExpiry.setDate(newExpiry.getDate() + 30)
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { status: 'ACTIVE', expiresAt: newExpiry },
        })
        await prisma.auditLog.create({
          data: { actorId: session.user.id, action: 'SUB_EXTENDED', entity: 'User', entityId: id },
        })
      }
      return NextResponse.json({ ok: true })
    }
    if (action === 'DELETE') {
      if (session.user.role !== 'ADMIN') return forbiddenResponse()
      await prisma.user.delete({ where: { id } })
      await prisma.auditLog.create({
        data: { actorId: session.user.id, action: 'USER_DELETED', entity: 'User', entityId: id },
      })
      return NextResponse.json({ ok: true })
    }
    if (action === 'CHANGE_PASSWORD') {
      if (session.user.role !== 'ADMIN') return forbiddenResponse()
      if (!parsed.data.password) return badRequestResponse('Password is required')
      const passwordHash = await bcrypt.hash(parsed.data.password, 12)
      await prisma.user.update({ where: { id }, data: { passwordHash } })
      await prisma.auditLog.create({
        data: { actorId: session.user.id, action: 'USER_PASSWORD_CHANGED', entity: 'User', entityId: id },
      })
      return NextResponse.json({ ok: true })
    }
    if (action === 'CHANGE_ROLE') {
      if (session.user.role !== 'ADMIN') return forbiddenResponse()
      if (!parsed.data.role) return badRequestResponse('Role is required')
      const user = await prisma.user.update({ where: { id }, data: { role: parsed.data.role }, select: safeUserSelect })
      await prisma.auditLog.create({
        data: { actorId: session.user.id, action: 'USER_ROLE_CHANGED', entity: 'User', entityId: id },
      })
      return NextResponse.json({ user })
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name || null } : {}),
        ...(parsed.data.email !== undefined ? { email: parsed.data.email } : {}),
        ...(parsed.data.phone !== undefined ? { phone: parsed.data.phone || null } : {}),
      },
      select: safeUserSelect,
    })
    await prisma.auditLog.create({
      data: { actorId: session.user.id, action: 'USER_UPDATED', entity: 'User', entityId: id },
    })
    return NextResponse.json({ user })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const session = await requireAdminOnlySession()
  if (!session) return forbiddenResponse()

  try {
    await prisma.user.delete({ where: { id } })
    await prisma.auditLog.create({
      data: { actorId: session.user.id, action: 'USER_DELETED', entity: 'User', entityId: id },
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return serverErrorResponse(error)
  }
}
