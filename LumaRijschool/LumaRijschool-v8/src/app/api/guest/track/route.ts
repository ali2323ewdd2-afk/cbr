import { NextResponse } from 'next/server'
import { trackGuest } from '@/lib/guest'

// Track guest on page view (called from frontend)
export async function POST(req: Request) {
  try {
    const result = await trackGuest(req)
    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
