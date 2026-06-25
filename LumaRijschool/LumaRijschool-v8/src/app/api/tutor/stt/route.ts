import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { speechToText } from '@/lib/ai/tutor'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const formData = await req.formData()
  const file = formData.get('audio') as File
  if (!file) return NextResponse.json({ error: 'audio file required' }, { status: 400 })
  const buffer = Buffer.from(await file.arrayBuffer())
  const text = await speechToText(buffer, file.type || 'audio/webm')
  if (!text) return NextResponse.json({ error: 'STT failed' }, { status: 500 })
  return NextResponse.json({ text })
}
