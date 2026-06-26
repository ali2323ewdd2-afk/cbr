import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ROLE_PERMISSIONS } from '@/lib/rbac'

export async function GET() {
  const perms = await prisma.permission.findMany({ orderBy: { category: 'asc' } })
  return NextResponse.json({ permissions: perms, roleMatrix: ROLE_PERMISSIONS })
}
