import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Generate a mini quiz from a category of traffic signs
export async function GET(req: Request) {
  const url = new URL(req.url)
  const category = url.searchParams.get('category') // WARNING | PRIORITY | PROHIBITORY | MANDATORY | INFORMATIONAL
  const count = parseInt(url.searchParams.get('count') || '5')

  const where: any = {}
  if (category) where.category = category
  const signs = await prisma.trafficSign.findMany({ where, take: 30 })

  if (signs.length < 4) return NextResponse.json({ error: 'Not enough signs for a quiz' }, { status: 400 })

  // Shuffle and pick
  const shuffled = signs.sort(() => Math.random() - 0.5).slice(0, Math.min(count, signs.length))

  // For each sign, generate 4 options (1 correct + 3 random)
  const allNames = signs.map((s) => s.name)
  const quiz = shuffled.map((sign) => {
    const wrongOptions = allNames.filter((n) => n !== sign.name).sort(() => Math.random() - 0.5).slice(0, 3)
    const options = [sign.name, ...wrongOptions].sort(() => Math.random() - 0.5)
    return {
      signId: sign.id,
      code: sign.code,
      imageUrl: sign.imageUrl,
      question: 'Welk verkeersbord is dit?',
      options,
      correctAnswer: sign.name,
      explanation: sign.description,
    }
  })

  return NextResponse.json({ quiz, category: category || 'ALL' })
}
