import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ROLE_PERMISSIONS } from '@/lib/rbac'
import { forbiddenResponse, requireAdminOnlySession, requireAdminSession } from '@/lib/admin-api'

export async function GET() {
  const session = await requireAdminSession()
  if (!session) return forbiddenResponse()
  const roles = await prisma.role.findMany({
    include: { _count: { select: { users: true, permissions: true } } },
    orderBy: { slug: 'asc' },
  })
  return NextResponse.json({ roles, rolePermissions: ROLE_PERMISSIONS })
}

export async function POST(req: Request) {
  const session = await requireAdminOnlySession()
  if (!session) return forbiddenResponse()
  const { userId, roleSlug, action } = await req.json()
  const { assignRole, revokeRole } = await import('@/lib/rbac')
  if (action === 'assign') await assignRole(userId, roleSlug, session.user.id)
  if (action === 'revoke') await revokeRole(userId, roleSlug)
  return NextResponse.json({ ok: true })
}
