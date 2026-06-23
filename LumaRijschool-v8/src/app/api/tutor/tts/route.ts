import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { textToSpeech } from '@/lib/ai/tutor'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { text } = await req.json()
  if (!text) return NextResponse.json({ error: 'text required' }, { status: 400 })
  const buffer = await textToSpeech(text)
  if (!buffer) return NextResponse.json({ error: 'TTS failed' }, { status: 500 })
  return new NextResponse(buffer as any, {
    headers: { 'Content-Type': 'audio/mpeg', 'Content-Length': String(buffer.length) },
  })
}
