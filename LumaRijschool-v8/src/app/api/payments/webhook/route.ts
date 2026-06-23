import { NextResponse } from 'next/server'
import { handleStripeWebhook } from '@/lib/payment/stripe'

export async function POST(req: Request) {
  const payload = Buffer.from(await req.arrayBuffer())
  const signature = req.headers.get('stripe-signature') ?? ''
  const result = await handleStripeWebhook(payload, signature)
  return NextResponse.json(result)
}
