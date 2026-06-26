import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const url = new URL(req.url)
  const onlyMine = url.searchParams.get('mine') === '1'
  const where: any = {}
  if (onlyMine) where.userId = session.user.id
  else if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') where.userId = session.user.id
  const invoices = await prisma.invoice.findMany({
    where,
    orderBy: { issuedAt: 'desc' },
    take: 50,
  })
  return NextResponse.json({ invoices })
}
