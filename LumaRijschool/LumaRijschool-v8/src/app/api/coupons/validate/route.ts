import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Validate a coupon code
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { code, planSlug, amountCents } = await req.json()
  if (!code) return NextResponse.json({ error: 'Code required' }, { status: 400 })

  const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase().trim() } })
  if (!coupon || !coupon.isActive) return NextResponse.json({ valid: false, error: 'Ongeldige code' }, { status: 404 })

  const now = new Date()
  if (coupon.startsAt > now) return NextResponse.json({ valid: false, error: 'Code nog niet geldig' }, { status: 400 })
  if (coupon.endsAt && coupon.endsAt < now) return NextResponse.json({ valid: false, error: 'Code verlopen' }, { status: 400 })
  if (coupon.maxRedemptions > 0 && coupon.currentRedemptions >= coupon.maxRedemptions) {
    return NextResponse.json({ valid: false, error: 'Maximaal aantal keer gebruikt' }, { status: 400 })
  }
  if (amountCents && amountCents < coupon.minAmountCents) {
    return NextResponse.json({ valid: false, error: `Minimum bedrag €${(coupon.minAmountCents / 100).toFixed(2)}` }, { status: 400 })
  }
  if (coupon.appliesToPlanSlug && coupon.appliesToPlanSlug !== planSlug) {
    return NextResponse.json({ valid: false, error: 'Code niet geldig voor dit abonnement' }, { status: 400 })
  }

  // Check user hasn't already redeemed
  const already = await prisma.couponRedemption.findUnique({
    where: { couponId_userId: { couponId: coupon.id, userId: session.user.id } },
  })
  if (already) return NextResponse.json({ valid: false, error: 'Al gebruikt door jou' }, { status: 400 })

  // Calculate discount
  let discountCents = 0
  if (coupon.type === 'PERCENT') {
    discountCents = Math.round((amountCents * coupon.value) / 100)
  } else if (coupon.type === 'FIXED') {
    discountCents = Math.round(coupon.value * 100)
  }
  const finalAmount = Math.max(0, amountCents - discountCents)

  return NextResponse.json({
    valid: true,
    coupon: {
      id: coupon.id,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      description: coupon.description,
    },
    discountCents,
    finalAmountCents: finalAmount,
  })
}
