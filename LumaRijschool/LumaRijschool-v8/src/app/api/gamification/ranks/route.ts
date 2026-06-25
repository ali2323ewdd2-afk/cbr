import { NextResponse } from 'next/server'
import { RANKS } from '@/lib/gamification/engine'

export async function GET() {
  return NextResponse.json({ ranks: RANKS })
}
