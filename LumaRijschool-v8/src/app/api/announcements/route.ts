import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Public — currently active announcements
export async function GET() {
  const now = new Date()
  const items = await prisma.announcement.findMany({
    where: {
      isActive: true,
      startsAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gte: now } }],
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ announcements: items })
}
