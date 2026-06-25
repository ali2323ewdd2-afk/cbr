import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getLiveVisitors } from '@/lib/redis'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPPORT')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const live = await getLiveVisitors()
  return NextResponse.json(live)
}
