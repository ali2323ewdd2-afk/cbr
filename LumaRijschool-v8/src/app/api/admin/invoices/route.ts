import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/rbac'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const ok = await hasPermission(session.user.id, 'users.view')
  if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const invoices = await prisma.invoice.findMany({
    orderBy: { issuedAt: 'desc' },
    take: 100,
  })
  // Fetch users separately
  const userIds = Array.from(new Set(invoices.map((i) => i.userId)))
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true },
  })
  const userMap = new Map(users.map((u) => [u.id, u]))
  return NextResponse.json({ invoices: invoices.map((i) => ({ ...i, user: userMap.get(i.userId) })) })
}
