import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import {
  forbiddenResponse,
  parsePagination,
  readJson,
  requireAdminSession,
  serverErrorResponse,
} from '@/lib/admin-api'

const refundSchema = z.object({
  paymentId: z.string().min(1),
  reason: z.enum(['REQUESTED', 'FRAUDULENT', 'DUPLICATE']).default('REQUESTED'),
})

function csvCell(value: string | number | null | undefined) {
  const text = String(value ?? '')
  return `"${text.replace(/"/g, '""')}"`
}

export async function GET(req: Request) {
  const session = await requireAdminSession()
  if (!session) return forbiddenResponse()

  try {
    const url = new URL(req.url)
    const { page, pageSize, skip } = parsePagination(url)
    const search = url.searchParams.get('search')?.trim()
    const status = url.searchParams.get('status')?.trim()
    const exportCsv = url.searchParams.get('export') === 'csv'
    const where = {
      ...(status ? { status: status.toUpperCase() } : {}),
      ...(search
        ? {
            OR: [
              { stripeSessionId: { contains: search, mode: 'insensitive' as const } },
              { stripePaymentIntentId: { contains: search, mode: 'insensitive' as const } },
              { user: { name: { contains: search, mode: 'insensitive' as const } } },
              { user: { email: { contains: search, mode: 'insensitive' as const } } },
              { plan: { name: { contains: search, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          plan: { select: { id: true, name: true, slug: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: exportCsv ? 0 : skip,
        take: exportCsv ? 1000 : pageSize,
      }),
      prisma.payment.count({ where }),
    ])

    const refunds = await prisma.refund.findMany({
      where: { paymentId: { in: payments.map((payment) => payment.id) } },
      orderBy: { createdAt: 'desc' },
    })
    const refundsByPayment = new Map<string, typeof refunds>()
    for (const refund of refunds) {
      refundsByPayment.set(refund.paymentId, [...(refundsByPayment.get(refund.paymentId) ?? []), refund])
    }

    if (exportCsv) {
      const rows = [
        ['Payment ID', 'Stripe Session', 'Stripe Payment Intent', 'User', 'Email', 'Plan', 'Amount', 'Currency', 'Status', 'Created At'],
        ...payments.map((payment) => [
          payment.id,
          payment.stripeSessionId ?? '',
          payment.stripePaymentIntentId ?? '',
          payment.user.name ?? '',
          payment.user.email,
          payment.plan.name,
          (payment.amountCents / 100).toFixed(2),
          payment.currency,
          payment.status,
          payment.createdAt.toISOString(),
        ]),
      ]
      return new NextResponse(rows.map((row) => row.map(csvCell).join(',')).join('\n'), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="payments.csv"',
        },
      })
    }

    return NextResponse.json({
      payments: payments.map((payment) => ({
        ...payment,
        refunds: refundsByPayment.get(payment.id) ?? [],
      })),
      total,
      page,
      pageSize,
    })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

export async function POST(req: Request) {
  const session = await requireAdminSession()
  if (!session) return forbiddenResponse()

  const parsed = await readJson(req, refundSchema)
  if (parsed.error) return parsed.error

  try {
    const { createRefund } = await import('@/lib/payment/stripe')
    const refund = await createRefund(parsed.data.paymentId, parsed.data.reason)
    await prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        action: 'PAYMENT_REFUND_REQUESTED',
        entity: 'Payment',
        entityId: parsed.data.paymentId,
      },
    })
    return NextResponse.json({ refund }, { status: 201 })
  } catch (error) {
    return serverErrorResponse(error)
  }
}
