import { NextResponse } from 'next/server'
import { getPopularSearches } from '@/lib/search'

export async function GET() {
  const popular = await getPopularSearches(10)
  return NextResponse.json({ popular })
}
