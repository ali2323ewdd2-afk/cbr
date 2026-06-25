/**
 * Enhanced AI Tutor — uses z-ai-web-dev-sdk for:
 * - Text chat completions (Dutch CBR theory)
 * - Image analysis (VLM) for traffic sign recognition
 * - Quiz generation
 * - Mistake explanation
 * - Study plan generation
 * - Text-to-speech (TTS)
 * - Speech-to-text (STT)
 */
import ZAI from 'z-ai-web-dev-sdk'
import { prisma } from '@/lib/prisma'

const SYSTEM_PROMPT = `Je bent Luma AI Tutor, een vriendelijke en duidelijke theorie-rijlesdocent voor het Nederlandse CBR theorie-examen.

Jouw stijl:
- Je spreekt Nederlands.
- Je geeft korte, heldere uitleg met concrete voorbeelden uit het verkeer.
- Je gebruikt maximaal 4 zinnen per antwoord, tenzij de student vraagt om meer.
- Je moedigt de student aan.
- Als een vraag buiten de theorie valt, verwijs je vriendelijk terug naar het curriculum.

Jouw expertise:
- Voorrangsregels (gelijkwaardige kruising, rotonde, voorrangsweg)
- Verkeersborden (waarschuwing, gebod, verbod, aanwijzing)
- Snelheid & regels (bebouwde kom, autosnelweg, inhalen)
- Parkeren & stilstaan
- Voorrangsvoertuigen en bijzondere situaties

Als de student een bord of situatie beschrijft, geef je de juiste uitleg volgens de Nederlandse verkeersregels.`

// ─── Text chat ──────────────────────────────────────────
export async function getTutorReply({
  messages,
  context,
}: {
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[]
  context?: string
}) {
  try {
    const zai = await ZAI.create()
    const fullMessages = [
      { role: 'system' as const, content: SYSTEM_PROMPT + (context ? `\n\nContext: ${context}` : '') },
      ...messages,
    ]
    const completion = await zai.chat.completions.create({
      messages: fullMessages,
      temperature: 0.5,
      max_tokens: 800,
    })
    const reply = completion.choices?.[0]?.message?.content ?? 'Ik heb even geen antwoord kunnen formuleren. Probeer het opnieuw.'
    return { reply, tokensIn: completion.usage?.prompt_tokens ?? 0, tokensOut: completion.usage?.completion_tokens ?? 0 }
  } catch (e: any) {
    console.error('Tutor LLM error:', e?.message)
    return {
      reply: 'Ik heb even een technisch hikje. Een paar seconden wachten en stel je vraag opnieuw — ik denk graag met je mee! 🚗',
      tokensIn: 0, tokensOut: 0,
    }
  }
}

// ─── Image analysis (VLM) ───────────────────────────────
export async function analyzeImage({
  imageUrl,
  prompt,
  context,
}: {
  imageUrl: string
  prompt?: string
  context?: string
}) {
  try {
    const zai = await ZAI.create()
    const userPrompt = prompt || 'Welk verkeersbord zie je op deze afbeelding? Leg uit wat het betekent en wat de bestuurder moet doen volgens de Nederlandse verkeersregels.'
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT + (context ? `\n\nContext: ${context}` : '') },
        {
          role: 'user',
          content: [
            { type: 'text', text: userPrompt },
            { type: 'image_url', image_url: { url: imageUrl } },
          ] as any,
        },
      ],
      temperature: 0.3,
      max_tokens: 600,
    })
    const reply = completion.choices?.[0]?.message?.content ?? 'Ik kan deze afbeelding niet analyseren. Probeer een andere.'
    return { reply, tokensIn: completion.usage?.prompt_tokens ?? 0, tokensOut: completion.usage?.completion_tokens ?? 0 }
  } catch (e: any) {
    console.error('Tutor VLM error:', e?.message)
    return {
      reply: 'Ik kon de afbeelding niet analyseren. Controleer of de URL klopt en of het een geldige afbeelding is.',
      tokensIn: 0, tokensOut: 0,
    }
  }
}

// ─── Quiz generator ─────────────────────────────────────
export async function generateQuiz({
  topic,
  count = 5,
  difficulty = 'MEDIUM',
}: {
  topic: string
  count?: number
  difficulty?: string
}) {
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
      "explanation": "korte uitleg"
    }
  ]
}
Geen markdown, geen uitleg buiten JSON.`,
        },
        { role: 'user', content: `Genereer ${count} vragen over ${topic} (moeilijkheid: ${difficulty}).` },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    })
    const content = completion.choices?.[0]?.message?.content ?? '{}'
    // Strip markdown code fences if present
    const clean = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    const parsed = JSON.parse(clean)
    return { quiz: parsed.questions || [], tokensIn: completion.usage?.prompt_tokens ?? 0, tokensOut: completion.usage?.completion_tokens ?? 0 }
  } catch (e: any) {
    console.error('Quiz generation error:', e?.message)
    return { quiz: [], tokensIn: 0, tokensOut: 0 }
  }
}

// ─── Mistake explanation ────────────────────────────────
export async function explainMistake({
  question,
  userAnswer,
  correctAnswer,
  topic,
}: {
  question: string
  userAnswer: string
  correctAnswer: string
  topic: string
}) {
  return getTutorReply({
    messages: [
      {
        role: 'user',
        content: `Ik had deze vraag fout:\nVraag: ${question}\nMijn antwoord: ${userAnswer}\nJuiste antwoord: ${correctAnswer}\nOnderwerp: ${topic}\n\nWaarom is het juiste antwoord juist? Leg kort uit.`,
      },
    ],
  })
}

// ─── Study plan generator ───────────────────────────────
export async function generateStudyPlan({
  examDate,
  studyGoal,
  weakAreas,
  dailyMinutes,
}: {
  examDate: string
  studyGoal: string
  weakAreas: string[]
  dailyMinutes: number
}) {
  try {
    const zai = await ZAI.create()
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `Je bent een studieplanner voor CBR theorie-examen. Genereer een plan in JSON:
{
  "plan": [
    {"day": 1, "title": "korte titel", "focus": "onderwerp", "duration_min": 30, "activities": ["les X", "vragen Y"]}
  ]
}
Geen markdown, alleen JSON.`,
        },
        {
          role: 'user',
          content: `Examendatum: ${examDate}\nDoel: ${studyGoal}\nZwakke plekken: ${weakAreas.join(', ')}\nMinuten per dag: ${dailyMinutes}\nGenereer een 14-dagen plan.`,
        },
      ],
      temperature: 0.5,
      max_tokens: 2000,
    })
    const content = completion.choices?.[0]?.message?.content ?? '{}'
    const clean = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    return { plan: JSON.parse(clean).plan || [], tokensIn: completion.usage?.prompt_tokens ?? 0, tokensOut: completion.usage?.completion_tokens ?? 0 }
  } catch (e: any) {
    return { plan: [], tokensIn: 0, tokensOut: 0 }
  }
}

// ─── Text-to-speech (TTS) ───────────────────────────────
export async function textToSpeech(text: string): Promise<Buffer | null> {
  try {
    const zai = await ZAI.create()
    // @ts-ignore - TTS API
    const result = await zai.audio.speech.create({
      input: text,
      voice: 'alloy',
      response_format: 'mp3',
    })
    if (result instanceof Buffer) return result
    // If it's a response, convert to buffer
    const ab = await (result as any).arrayBuffer?.()
    return ab ? Buffer.from(ab) : null
  } catch (e: any) {
    console.error('TTS error:', e?.message)
    return null
  }
}

// ─── Speech-to-text (STT) ───────────────────────────────
export async function speechToText(audioBuffer: Buffer, mimeType = 'audio/webm'): Promise<string | null> {
  try {
    const zai = await ZAI.create()
    // @ts-ignore - STT API
    const result = await zai.audio.transcriptions.create({
      file: { buffer: audioBuffer, mimeType },
      model: 'whisper-1',
    })
    return result.text ?? null
  } catch (e: any) {
    console.error('STT error:', e?.message)
    return null
  }
}

// ─── Session management ─────────────────────────────────
export async function createTutorSession(userId: string, title = 'Nieuwe sessie', context?: string) {
  return prisma.tutorSession.create({ data: { userId, title, context } })
}

export async function appendMessage(
  sessionId: string,
  role: 'USER' | 'ASSISTANT' | 'SYSTEM',
  content: string,
  tokensIn = 0,
  tokensOut = 0,
  imageUrl?: string,
) {
  return prisma.tutorMessage.create({
    data: { sessionId, role, content, tokensIn, tokensOut, imageUrl },
  })
}
