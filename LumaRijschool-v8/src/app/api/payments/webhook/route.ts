import { NextResponse } from 'next/server'
import { handleStripeWebhook } from '@/lib/payment/stripe'

export async function POST(req: Request) {
  try {
    const payload = Buffer.from(await req.arrayBuffer())
    const signature = req.headers.get('stripe-signature') ?? ''
    const result = await handleStripeWebhook(payload, signature)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook processing failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
