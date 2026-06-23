import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createRefund } from '@/lib/payment/stripe'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) return null
  return session
}

export async function GET() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const refunds = await prisma.refund.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  // Fetch payments + users separately (Refund has no relation to Payment)
  const paymentIds = Array.from(new Set(refunds.map((r) => r.paymentId).filter(Boolean))) as string[]
  const payments = await prisma.payment.findMany({
    where: { id: { in: paymentIds } },
    include: { plan: true },
  })
  const paymentMap = new Map(payments.map((p) => [p.id, p]))
  const userIds = Array.from(new Set(payments.map((p) => p.userId).filter(Boolean))) as string[]
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true },
  })
  const userMap = new Map(users.map((u) => [u.id, u]))
  return NextResponse.json({
    refunds: refunds.map((r) => {
      const payment = paymentMap.get(r.paymentId)
      return {
        ...r,
        payment: payment ? { ...payment, user: userMap.get(payment.userId) } : null,
      }
    }),
  })
}

export async function POST(req: Request) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { paymentId, reason } = await req.json()
  try {
    const result = await createRefund(paymentId, reason || 'REQUESTED')
    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
