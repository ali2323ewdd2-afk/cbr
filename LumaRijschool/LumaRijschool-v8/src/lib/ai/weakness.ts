/**
 * AI Tutor — Weakness Analysis
 * Analyzes user's wrong answers by topic and generates a treatment plan.
 */
import ZAI from 'z-ai-web-dev-sdk'
import { prisma } from '@/lib/prisma'

export interface WeaknessTopic {
  topicId: string
  topicName: string
  wrongCount: number
  totalCount: number
  accuracy: number
  recommendedLessons: string[]
}

export async function analyzeWeaknesses(userId: string): Promise<{
  weaknesses: WeaknessTopic[]
  overallAccuracy: number
  recommendedPlan: string
}> {
  // Get all answers in the last 90 days
  const since = new Date(Date.now() - 90 * 86400000)
  const answers = await prisma.answer.findMany({
    where: { userId, createdAt: { gte: since } },
    include: { question: { include: { topic: true, lesson: true } } },
  })

  // Group by topic
  const byTopic: Record<string, { topic: any; correct: number; total: number; lessons: Set<string> }> = {}
  for (const a of answers) {
    const t = a.question.topic
    if (!byTopic[t.id]) byTopic[t.id] = { topic: t, correct: 0, total: 0, lessons: new Set<string>() }
    byTopic[t.id].total++
    if (a.isCorrect) byTopic[t.id].correct++
    if (a.question.lessonId) byTopic[t.id].lessons.add(a.question.lessonId)
  }

  // Calculate weaknesses (accuracy < 70%)
  const weaknesses: WeaknessTopic[] = []
  for (const v of Object.values(byTopic)) {
    const accuracy = v.total > 0 ? v.correct / v.total : 0
    if (accuracy < 0.7 && v.total >= 3) {
      weaknesses.push({
        topicId: v.topic.id,
        topicName: v.topic.name,
        wrongCount: v.total - v.correct,
        totalCount: v.total,
        accuracy: Math.round(accuracy * 100),
        recommendedLessons: Array.from(v.lessons).slice(0, 5),
      })
    }
  }
  weaknesses.sort((a, b) => a.accuracy - b.accuracy)

  const totalCorrect = answers.filter((a) => a.isCorrect).length
  const overallAccuracy = answers.length > 0 ? Math.round((totalCorrect / answers.length) * 100) : 0

  // Generate AI treatment plan if there are weaknesses
  let recommendedPlan = ''
  if (weaknesses.length > 0) {
    try {
      const zai = await ZAI.create()
      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'Je bent een studieadviseur voor het CBR theorie-examen. Genereer een kort behandelplan in maximaal 4 zinnen.',
          },
          {
            role: 'user',
            content: `Mijn zwakke plekken (accuracy %):\n${weaknesses.map((w) => `- ${w.topicName}: ${w.accuracy}% (${w.wrongCount} fout van ${w.totalCount})`).join('\n')}\n\nMaak een behandelplan: wat moet ik elke dag doen?`,
          },
        ],
        temperature: 0.5,
        max_tokens: 400,
      })
      recommendedPlan = completion.choices?.[0]?.message?.content ?? ''
    } catch {
      recommendedPlan = weaknesses.length > 0
        ? `Focus op ${weaknesses[0].topicName}. Maak dagelijks 10 oefenvragen over dit onderwerp en bekijk de bijbehorende lessen.`
        : ''
    }
  }

  return { weaknesses, overallAccuracy, recommendedPlan }
}

// ─── AI Exam Generator ──────────────────────────────────
export async function generateCustomExam({
  topic,
  count = 20,
  difficulty = 'MEDIUM',
  userId,
}: {
  topic: string
  count?: number
  difficulty?: string
  userId: string
}): Promise<{ questions: any[] }> {
  try {
    const zai = await ZAI.create()
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `Je bent een CBR theorie-examen generator. Genereer ${count} meerkeuzevragen over "${topic}" met moeilijkheidsgraad ${difficulty}. Antwoord ALTIJD in exact dit JSON-formaat:
{
  "questions": [
    {
      "stem": "vraag tekst",
      "options": [{"key": "A", "text": "optie A"}, {"key": "B", "text": "optie B"}, {"key": "C", "text": "optie C"}, {"key": "D", "text": "optie D"}],
      "correctKey": "A",
      "explanation": "korte uitleg",
      "difficulty": "${difficulty}",
      "topic": "${topic}"
    }
  ]
}
Geen markdown, geen uitleg buiten JSON.`,
        },
        { role: 'user', content: `Genereer ${count} vragen over ${topic} (moeilijkheid: ${difficulty}).` },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    })
    const content = completion.choices?.[0]?.message?.content ?? '{}'
    const clean = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    const parsed = JSON.parse(clean)
    return { questions: parsed.questions || [] }
  } catch (e: any) {
    console.error('AI exam gen error:', e?.message)
    return { questions: [] }
  }
}
