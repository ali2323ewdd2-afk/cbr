import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const ip = url.searchParams.get('ip')?.trim()
  const path = url.searchParams.get('path') ?? '/'

  try {
    if (ip) {
      const blocked = await prisma.ipBlock.findUnique({ where: { ip } })
      if (blocked && (!blocked.expiresAt || blocked.expiresAt > new Date())) {
        return NextResponse.json({ blocked: true }, { status: 403 })
      }
    }

    if (!path.startsWith('/maintenance')) {
      const maintenanceMode = await prisma.systemSetting.findUnique({ where: { key: 'MAINTENANCE_MODE' } })
      if (maintenanceMode?.value === 'true') {
        return NextResponse.json({ maintenance: true }, { status: 503 })
      }
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true, degraded: true })
  }
}
