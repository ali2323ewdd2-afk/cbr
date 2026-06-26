import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { analyzeImage } from '@/lib/ai/tutor'

// Search traffic signs by uploading an image — AI recognizes the sign
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { imageUrl } = body
  if (!imageUrl) return NextResponse.json({ error: 'imageUrl required' }, { status: 400 })

  const { reply } = await analyzeImage({
    imageUrl,
    prompt: 'Welk verkeersbord zie je op deze afbeelding? Identificeer het bord (code, naam, categorie) en leg uit wat het betekent volgens de Nederlandse verkeersregels.',
  })

  return NextResponse.json({ analysis: reply })
}
