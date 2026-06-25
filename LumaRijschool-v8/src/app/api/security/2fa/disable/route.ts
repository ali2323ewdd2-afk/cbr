import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { disable2FA, verify2FA } from '@/lib/security'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { token } = await req.json().catch(() => ({}))
  if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 })
  const valid = await verify2FA(session.user.id, token)
  if (!valid) return NextResponse.json({ error: 'Ongeldige code' }, { status: 400 })
  await disable2FA(session.user.id)
  return NextResponse.json({ ok: true })
}
