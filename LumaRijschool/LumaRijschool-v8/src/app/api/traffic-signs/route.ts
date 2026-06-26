import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const category = url.searchParams.get('category')
  const where: any = {}
  if (category) where.category = category
  const signs = await prisma.trafficSign.findMany({ where, orderBy: { code: 'asc' } })
  return NextResponse.json({ signs })
}
