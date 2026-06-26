import { NextResponse } from 'next/server'
import { generateSitemap } from '@/lib/seo'
import { getBaseUrl } from '@/lib/base-url'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const origin = getBaseUrl(req)
  const xml = await generateSitemap(origin)
  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
