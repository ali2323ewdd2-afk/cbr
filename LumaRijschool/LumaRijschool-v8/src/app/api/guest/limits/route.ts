import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkGuestLimits } from '@/lib/guest'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const guestId = url.searchParams.get('guestId')
  if (!guestId) return NextResponse.json({ error: 'guestId required' }, { status: 400 })
  const limits = await checkGuestLimits(guestId)
  return NextResponse.json(limits)
}
