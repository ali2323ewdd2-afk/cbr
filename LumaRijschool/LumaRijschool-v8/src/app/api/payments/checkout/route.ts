import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createCheckoutSession } from '@/lib/payment/stripe'
import { getBaseUrl } from '@/lib/base-url'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { planSlug } = body as { planSlug: string }
  if (!planSlug) return NextResponse.json({ error: 'Plan required' }, { status: 400 })

  const origin = getBaseUrl(req)
  try {
    const result = await createCheckoutSession({
      userId: session.user.id,
      userEmail: session.user.email,
      userName: session.user.name ?? session.user.email,
      planSlug,
      origin,
    })
    return NextResponse.json(result)
  } catch (e) {
    console.error('[payments/checkout] failed:', e)
    return NextResponse.json(
      { error: 'Betaling is momenteel niet beschikbaar. Probeer het later opnieuw.' },
      { status: 503 },
    )
  }
}
