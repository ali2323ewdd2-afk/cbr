import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { forbiddenResponse, requireAdminOnlySession } from '@/lib/admin-api'

const ALLOWED_SETTINGS = new Set([
  'SITE_NAME',
  'SITE_LOGO',
  'SITE_FAVICON',
  'SITE_DESCRIPTION',
  'REGISTRATION_OPEN',
  'META_TITLE',
  'META_DESCRIPTION',
  'FACEBOOK_URL',
  'INSTAGRAM_URL',
  'YOUTUBE_URL',
  'TIKTOK_URL',
  'GOOGLE_ANALYTICS_ID',
  'GOOGLE_TAG_MANAGER_ID',
  'MAINTENANCE_MODE',
  'MAINTENANCE_MESSAGE',
  'STRIPE_ENABLED',
  'AI_TUTOR_ENABLED',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_FROM',
])

export async function GET() {
  const session = await requireAdminOnlySession()
  if (!session) return forbiddenResponse()
  const settings = await prisma.systemSetting.findMany({
    where: { category: { not: 'IMPERSONATE' } },
    orderBy: { category: 'asc' },
  })
  // Group by category
  const grouped: Record<string, Record<string, string>> = {}
  for (const s of settings) {
    if (!grouped[s.category]) grouped[s.category] = {}
    grouped[s.category][s.key] = s.value
  }
  return NextResponse.json({ settings: grouped })
}

export async function PATCH(req: Request) {
  const session = await requireAdminOnlySession()
  if (!session) return forbiddenResponse()
  const { key, value, category } = await req.json()
  if (!ALLOWED_SETTINGS.has(key)) {
    return NextResponse.json({ error: 'Setting key is not allowed' }, { status: 400 })
  }
  await prisma.systemSetting.upsert({
    where: { key },
    update: { value, category },
    create: { key, value, category: category || 'GENERAL' },
  })
  return NextResponse.json({ ok: true })
}
