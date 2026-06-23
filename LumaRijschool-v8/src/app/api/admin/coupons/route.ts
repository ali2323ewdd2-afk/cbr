import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) return null
  return session
}

export async function GET() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' }, include: { _count: { select: { redemptions: true } } } })
  return NextResponse.json({ coupons })
}

export async function POST(req: Request) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json()
  const coupon = await prisma.coupon.create({
    data: {
      code: body.code.toUpperCase().trim(),
      description: body.description,
      type: body.type, // PERCENT | FIXED | DAYS
      value: parseFloat(body.value),
      minAmountCents: body.minAmountCents || 0,
      maxRedemptions: body.maxRedemptions || 0,
      endsAt: body.endsAt ? new Date(body.endsAt) : null,
      appliesToPlanSlug: body.appliesToPlanSlug || null,
      isActive: true,
      createdBy: session.user.id,
    },
  })
  return NextResponse.json({ coupon })
}

export async function DELETE(req: Request) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await req.json()
  await prisma.coupon.update({ where: { id }, data: { isActive: false } })
  return NextResponse.json({ ok: true })
}
