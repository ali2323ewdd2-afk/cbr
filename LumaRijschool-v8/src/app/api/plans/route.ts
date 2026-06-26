import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { priceCents: 'asc' },
    })
    return NextResponse.json({ plans })
  } catch {
    return NextResponse.json({
      plans: [
        {
          slug: 'WEEK',
          name: 'Week',
          description: 'Unlimited theory exams, lessons, practice and access for 7 days',
          priceCents: 1300,
          currency: 'EUR',
          durationDays: 7,
          features: JSON.stringify(['Unlimited theory exams', 'Unlimited lessons', 'Unlimited practice', 'Unlimited access']),
          isPopular: false,
          isActive: true,
        },
        {
          slug: 'MONTH',
          name: 'Month',
          description: 'Unlimited theory exams, lessons, practice and access for 30 days',
          priceCents: 3500,
          currency: 'EUR',
          durationDays: 30,
          features: JSON.stringify(['Unlimited theory exams', 'Unlimited lessons', 'Unlimited practice', 'Unlimited access']),
          isPopular: true,
          isActive: true,
        },
      ],
      degraded: true,
    })
  }
}
