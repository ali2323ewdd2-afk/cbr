import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ROLE_PERMISSIONS } from '@/lib/rbac'
import { forbiddenResponse, requireAdminSession } from '@/lib/admin-api'

export async function GET() {
  const session = await requireAdminSession()
  if (!session) return forbiddenResponse()
  const perms = await prisma.permission.findMany({ orderBy: { category: 'asc' } })
  return NextResponse.json({ permissions: perms, roleMatrix: ROLE_PERMISSIONS })
}
