import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPPORT')) return null
  return session
}

export async function GET() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const settings = await prisma.systemSetting.findMany({ orderBy: { category: 'asc' } })
  // Group by category
  const grouped: Record<string, Record<string, string>> = {}
  for (const s of settings) {
    if (!grouped[s.category]) grouped[s.category] = {}
    grouped[s.category][s.key] = s.value
  }
  return NextResponse.json({ settings: grouped })
}

export async function PATCH(req: Request) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { key, value, category } = await req.json()
  await prisma.systemSetting.upsert({
    where: { key },
    update: { value, category },
    create: { key, value, category: category || 'GENERAL' },
  })
  return NextResponse.json({ ok: true })
}
