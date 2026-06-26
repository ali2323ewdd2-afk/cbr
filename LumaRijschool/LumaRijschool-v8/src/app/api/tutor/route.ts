import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTutorReply, analyzeImage, generateQuiz, explainMistake } from '@/lib/ai/tutor'
import { prisma } from '@/lib/prisma'
import { hasActiveSubscription } from '@/lib/payment/stripe'
import { awardXp } from '@/lib/gamification/engine'
import { applyRateLimit } from '@/lib/rate-limit'
import { pushTutorMessage } from '@/lib/redis'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Rate limit: 15/hour
  const rl = await applyRateLimit(req, 'TUTOR', session.user.id)
  if (rl) return rl

  const hasSub = await hasActiveSubscription(session.user.id)
  if (!hasSub) return NextResponse.json({ error: 'AI Tutor vereist een abonnement', code: 'SUB_REQUIRED' }, { status: 402 })

  const body = await req.json()
  const { message, sessionId, context, mode, imageUrl, quizTopic, quizCount, mistakeData } = body

  // ─── Mode: Quiz generation ──────────────────────────
  if (mode === 'quiz') {
    const { quiz, tokensIn, tokensOut } = await generateQuiz({
      topic: quizTopic || 'Verkeersborden',
      count: quizCount || 5,
    })
    return NextResponse.json({ quiz, tokensIn, tokensOut })
  }

  // ─── Mode: Image analysis (VLM) ─────────────────────
  if (mode === 'image' && imageUrl) {
    const { reply, tokensIn, tokensOut } = await analyzeImage({ imageUrl, prompt: message })
    // Save to session
    let sess = sessionId ? await prisma.tutorSession.findFirst({ where: { id: sessionId, userId: session.user.id } }) : null
    if (!sess) sess = await prisma.tutorSession.create({ data: { userId: session.user.id, title: 'Afbeelding analyse', context } })
    await prisma.tutorMessage.create({ data: { sessionId: sess.id, role: 'USER', content: message || 'Analyseer deze afbeelding', imageUrl, tokensIn, tokensOut } })
    await prisma.tutorMessage.create({ data: { sessionId: sess.id, role: 'ASSISTANT', content: reply, tokensIn, tokensOut } })
    await pushTutorMessage(session.user.id, { role: 'user', content: message })
    await pushTutorMessage(session.user.id, { role: 'assistant', content: reply })
    await awardXp(session.user.id, 5, 'TUTOR', sess.id)
    return NextResponse.json({ reply, sessionId: sess.id, tokensIn, tokensOut })
  }

  // ─── Mode: Mistake explanation ──────────────────────
  if (mode === 'mistake' && mistakeData) {
    const { reply, tokensIn, tokensOut } = await explainMistake(mistakeData)
    return NextResponse.json({ reply, tokensIn, tokensOut })
  }

  // ─── Default: text chat ─────────────────────────────
  if (!message || message.trim().length === 0) {
    return NextResponse.json({ error: 'Leeg bericht' }, { status: 400 })
  }

  let sess = sessionId
    ? await prisma.tutorSession.findFirst({ where: { id: sessionId, userId: session.user.id } })
    : null
  if (!sess) sess = await prisma.tutorSession.create({ data: { userId: session.user.id, title: message.slice(0, 50), context } })

  const history = await prisma.tutorMessage.findMany({
    where: { sessionId: sess.id },
    orderBy: { createdAt: 'asc' },
    take: 12,
  })
  const conversation = [
    ...history.map((m) => ({ role: m.role.toLowerCase() as any, content: m.content })),
    { role: 'user' as const, content: message },
  ]
  await prisma.tutorMessage.create({ data: { sessionId: sess.id, role: 'USER', content: message } })

  const { reply, tokensIn, tokensOut } = await getTutorReply({ messages: conversation, context })
  await prisma.tutorMessage.create({ data: { sessionId: sess.id, role: 'ASSISTANT', content: reply, tokensIn, tokensOut } })
  await pushTutorMessage(session.user.id, { role: 'user', content: message })
  await pushTutorMessage(session.user.id, { role: 'assistant', content: reply })
  await awardXp(session.user.id, 5, 'TUTOR', sess.id)
  await prisma.tutorSession.update({ where: { id: sess.id }, data: { updatedAt: new Date() } })

  return NextResponse.json({ reply, sessionId: sess.id, tokensIn, tokensOut })
}
