import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { globalSearch } from '@/lib/search'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const q = url.searchParams.get('q') ?? ''
  const session = await getServerSession(authOptions)
  const results = await globalSearch(q, session?.user?.id)
  return NextResponse.json({ results, query: q })
}
