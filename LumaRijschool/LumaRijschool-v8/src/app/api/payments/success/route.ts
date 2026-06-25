import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { activateSubscription } from '@/lib/payment/stripe'

// Real Stripe success handler — verifies session with Stripe API.
export async function GET(req: Request) {
  const url = new URL(req.url)
  const sessionId = url.searchParams.get('session_id')

  if (!sessionId) {
    return NextResponse.redirect(new URL('/pricing?error=invalid_payment', url.origin))
  }

  // Find payment by sessionId
  const payment = await prisma.payment.findFirst({ where: { stripeSessionId: sessionId } })
  if (!payment) {
    return NextResponse.redirect(new URL('/pricing?error=invalid_payment', url.origin))
  }

  // Verify with Stripe that the session is paid (no mock!)
  try {
    const { getStripe } = await import('@/lib/payment/stripe')
    const stripe = getStripe()
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    if (session.payment_status !== 'paid') {
      return NextResponse.redirect(new URL('/pricing?error=not_paid', url.origin))
    }
    // Activate subscription (idempotent)
    await activateSubscription(payment.id, sessionId)
    return NextResponse.redirect(new URL('/dashboard?subscribed=1', url.origin))
  } catch (e: any) {
    console.error('Stripe verification failed:', e.message)
    return NextResponse.redirect(new URL('/pricing?error=verification_failed', url.origin))
  }
}
