import { NextResponse } from 'next/server'
import { generateRobotsTxt } from '@/lib/seo'
import { getBaseUrl } from '@/lib/base-url'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const origin = getBaseUrl(req)
  const txt = generateRobotsTxt(origin)
  return new NextResponse(txt, {
    headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'public, max-age=3600' },
  })
}
