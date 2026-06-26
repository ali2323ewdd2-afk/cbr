import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const now = new Date()
  const events = await prisma.seasonalEvent.findMany({
    where: { isActive: true, startDate: { lte: now }, endDate: { gte: now } },
    include: { rewards: { orderBy: { tier: 'asc' } } },
  })
  return NextResponse.json({ events })
}
