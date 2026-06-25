/**
 * Stripe — Real Stripe only (no mock mode).
 * Features: checkout, webhook retry, refund, upgrade/downgrade,
 * grace period, invoice PDF, tax support.
 */
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { sendEmail, emailTemplates } from '@/lib/email/service'
import { audit } from '@/lib/security'

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is required. Mock mode is disabled in production.')
  }
  return new Stripe(key, { apiVersion: '2024-06-20' as any })
}

export const stripeEnabled = () => {
  const key = process.env.STRIPE_SECRET_KEY
  return !!key && !key.startsWith('sk_test_mock')
}

// ─── Create checkout session (real Stripe only) ─────────
export async function createCheckoutSession({
  userId, userEmail, userName, planSlug, origin,
}: {
  userId: string
  userEmail: string
  userName: string
  planSlug: string
  origin: string
}) {
  const plan = await prisma.plan.findUnique({ where: { slug: planSlug } })
  if (!plan) throw new Error('Plan not found')

  // Ensure plan has a Stripe price ID
  if (!plan.stripePriceId) {
    throw new Error(`Plan ${plan.slug} has no Stripe price ID configured. Set STRIPE_PRICE_${plan.slug.toUpperCase()} env var.`)
  }

  const stripe = getStripe()

  // Get user's country for tax
  const user = await prisma.user.findUnique({ where: { id: userId } })
  const taxRate = await prisma.taxRate.findFirst({ where: { country: user?.country ?? 'NL', isActive: true } })

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: userEmail,
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    metadata: { userId, planSlug, planId: plan.id },
    success_url: `${origin}/api/payments/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/pricing?canceled=1`,
    automatic_tax: { enabled: true },
    tax_id_collection: { enabled: true },
    invoice_creation: {
      enabled: true,
      invoice_data: {
        metadata: { userId, planSlug },
        rendering_options: { amount_tax_display: 'exclude_tax' },
      },
    },
    payment_intent_data: {
      metadata: { userId, planSlug },
      setup_future_usage: 'off_session', // for retry on failed renewal
    },
    expires_at: Math.floor(Date.now() / 1000) + 1800, // 30 min
  })

  // Create pending payment record
  await prisma.payment.create({
    data: {
      userId,
      planId: plan.id,
      amountCents: plan.priceCents,
      currency: plan.currency,
      status: 'PENDING',
      method: 'STRIPE',
      stripeSessionId: session.id,
    },
  })

  return { url: session.url, sessionId: session.id, mode: 'live' }
}

// ─── Handle Stripe webhook (with retry built-in via Stripe) ─
export async function handleStripeWebhook(payload: Buffer, signature: string) {
  const stripe = getStripe()
  const event = stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!,
  )

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.userId
      const planSlug = session.metadata?.planSlug
      if (!userId || !planSlug) return { received: true, error: 'missing metadata' }
      const payment = await prisma.payment.findFirst({ where: { stripeSessionId: session.id } })
      if (payment) {
        const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id
        await activateSubscription(payment.id, session.id, paymentIntentId)
      }
      break
    }
    case 'payment_intent.payment_failed': {
      const intent = event.data.object as Stripe.PaymentIntent
      const userId = intent.metadata?.userId
      if (userId) {
        await prisma.payment.updateMany({
          where: { stripePaymentIntentId: intent.id },
          data: { status: 'FAILED' },
        })
        await prisma.notification.create({
          data: {
            userId,
            type: 'PAYMENT',
            title: 'Betaling mislukt',
            body: 'Je betaling is mislukt. Probeer het opnieuw of neem contact op met support.',
            link: '/pricing',
          },
        }).catch(() => {})
        // Enter grace period if user has active sub
        const sub = await prisma.subscription.findUnique({ where: { userId } })
        if (sub && sub.status === 'ACTIVE') {
          await prisma.subscription.update({
            where: { id: sub.id },
            data: { status: 'PAST_DUE' },
          })
          // 7-day grace period
          const graceEnd = new Date()
          graceEnd.setDate(graceEnd.getDate() + 7)
          await prisma.notification.create({
            data: {
              userId,
              type: 'PAYMENT',
              title: 'Betaalproblem — grace periode actief',
              body: `Je hebt 7 dagen om je betaling te vernieuwen (${graceEnd.toLocaleDateString('nl-NL')}). Daarna verloopt je abonnement.`,
              link: '/pricing',
            },
          }).catch(() => {})
        }
      }
      break
    }
    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge
      const payment = await prisma.payment.findFirst({
        where: { stripePaymentIntentId: charge.payment_intent as string },
      })
      if (payment) {
        await prisma.refund.create({
          data: {
            paymentId: payment.id,
            amountCents: charge.amount_refunded,
            reason: charge.refunds?.data[0]?.reason ?? 'REQUESTED',
            status: 'SUCCEEDED',
            stripeRefundId: charge.refunds?.data[0]?.id,
          },
        })
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'REFUNDED' },
        })
        // If full refund, deactivate subscription
        if (charge.amount_refunded >= charge.amount) {
          await prisma.subscription.updateMany({
            where: { userId: payment.userId },
            data: { status: 'CANCELLED' },
          })
        }
        await audit({ action: 'REFUND_PROCESSED', entity: 'Payment', entityId: payment.id, metadata: JSON.stringify({ amount: charge.amount_refunded }) })
      }
      break
    }
    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice
      const userId = invoice.metadata?.userId ?? (invoice.customer_email ? (await prisma.user.findUnique({ where: { email: invoice.customer_email } }))?.id : null)
      if (userId) {
        await prisma.invoice.create({
          data: {
            userId,
            amountCents: invoice.amount_paid,
            taxCents: (invoice as any).tax ?? 0,
            currency: invoice.currency.toUpperCase(),
            invoiceNumber: invoice.number ?? `INV-${Date.now()}`,
            pdfUrl: invoice.invoice_pdf,
            stripeInvoiceId: invoice.id,
            status: 'PAID',
            issuedAt: new Date(),
          },
        })
      }
      break
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const userId = invoice.metadata?.userId
      if (userId) {
        await prisma.invoice.create({
          data: {
            userId,
            amountCents: invoice.amount_due,
            taxCents: (invoice as any).tax ?? 0,
            currency: invoice.currency.toUpperCase(),
            invoiceNumber: invoice.number ?? `INV-${Date.now()}`,
            pdfUrl: invoice.invoice_pdf,
            stripeInvoiceId: invoice.id,
            status: 'OPEN',
            issuedAt: new Date(),
          },
        })
      }
      break
    }
  }
  return { received: true }
}

// ─── Activate subscription after successful payment ─────
export async function activateSubscription(paymentId: string, stripeSessionId?: string, stripePaymentIntentId?: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { plan: true, user: true },
  })
  if (!payment) throw new Error('Payment not found')
  if (payment.status === 'PAID') return payment

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + payment.plan.durationDays)

  const updated = await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: 'PAID',
      stripeSessionId: stripeSessionId ?? payment.stripeSessionId,
      ...(stripePaymentIntentId ? { stripePaymentIntentId } : {}),
    },
  })

  // Activate subscription (handles upgrade/downgrade)
  const existing = await prisma.subscription.findUnique({ where: { userId: payment.userId } })
  if (existing) {
    // Upgrade/downgrade: extend from current expiry if active, otherwise from now
    const baseDate = existing.status === 'ACTIVE' && existing.expiresAt > new Date() ? existing.expiresAt : new Date()
    const newExpiry = new Date(baseDate)
    newExpiry.setDate(newExpiry.getDate() + payment.plan.durationDays)
    await prisma.subscription.update({
      where: { id: existing.id },
      data: {
        planId: payment.planId,
        status: 'ACTIVE',
        startedAt: new Date(),
        expiresAt: newExpiry,
        stripeSubscriptionId: stripeSessionId,
      },
    })
  } else {
    await prisma.subscription.create({
      data: {
        userId: payment.userId,
        planId: payment.planId,
        status: 'ACTIVE',
        startedAt: new Date(),
        expiresAt,
        stripeSubscriptionId: stripeSessionId,
      },
    })
  }

  await sendEmail({
    to: payment.user.email,
    ...emailTemplates.paymentConfirmation(
      payment.user.name ?? payment.user.email,
      payment.plan.name,
      `${(payment.amountCents / 100).toFixed(2)} ${payment.currency}`,
      expiresAt.toLocaleDateString('nl-NL'),
    ),
  })

  return updated
}

// ─── Create refund (admin action) ───────────────────────
export async function createRefund(paymentId: string, reason: string = 'REQUESTED'): Promise<{ ok: boolean; refundId?: string }> {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } })
  if (!payment || !payment.stripeSessionId) throw new Error('Payment not refundable')

  const stripe = getStripe()
  // Find the payment intent from the session
  const session = await stripe.checkout.sessions.retrieve(payment.stripeSessionId)
  if (!session.payment_intent) throw new Error('No payment intent found')
  const paymentIntentId = session.payment_intent as string

  const refund = await stripe.refunds.create({
    payment_intent: paymentIntentId,
    reason: reason as any,
  })

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: refund.status === 'succeeded' ? 'REFUNDED' : payment.status,
        stripePaymentIntentId: payment.stripePaymentIntentId ?? paymentIntentId,
      },
    }),
    prisma.refund.create({
      data: {
        paymentId,
        amountCents: payment.amountCents,
        reason,
        status: refund.status === 'succeeded' ? 'SUCCEEDED' : 'PENDING',
        stripeRefundId: refund.id,
      },
    }),
  ])

  await audit({ action: 'REFUND_CREATED', entity: 'Payment', entityId: paymentId, metadata: JSON.stringify({ amount: payment.amountCents, reason }) })

  return { ok: true, refundId: refund.id }
}

// ─── Check active subscription with grace period ────────
export async function hasActiveSubscription(userId: string) {
  const sub = await prisma.subscription.findUnique({ where: { userId } })
  if (!sub) return false

  // ACTIVE — fully active
  if (sub.status === 'ACTIVE' && sub.expiresAt >= new Date()) return true

  // PAST_DUE — grace period (7 days from expiry)
  if (sub.status === 'PAST_DUE') {
    const graceEnd = new Date(sub.expiresAt)
    graceEnd.setDate(graceEnd.getDate() + 7)
    if (graceEnd >= new Date()) return true
    // grace period over
    await prisma.subscription.update({ where: { id: sub.id }, data: { status: 'EXPIRED' } })
    return false
  }

  // Auto-expire if past date
  if (sub.expiresAt < new Date() && sub.status === 'ACTIVE') {
    await prisma.subscription.update({ where: { id: sub.id }, data: { status: 'EXPIRED' } })
    return false
  }

  return false
}

export async function requireActiveSubscription(userId: string) {
  const active = await hasActiveSubscription(userId)
  if (!active) throw new Error('Subscription required')
}
