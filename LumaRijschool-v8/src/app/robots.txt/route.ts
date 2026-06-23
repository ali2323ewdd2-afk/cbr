import { NextResponse } from 'next/server'
import { generateRobotsTxt } from '@/lib/seo'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const origin = new URL(req.url).origin
  const txt = generateRobotsTxt(origin)
  return new NextResponse(txt, {
    headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'public, max-age=3600' },
  })
}
