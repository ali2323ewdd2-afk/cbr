/**
 * Global search engine — lessons, exams, questions, traffic signs, FAQs.
 */
import { prisma } from '@/lib/prisma'
import { cacheGet, cacheSet } from '@/lib/redis'

export interface SearchResult {
  type: 'lesson' | 'exam' | 'question' | 'sign' | 'faq'
  id: string
  title: string
  subtitle?: string
  url: string
  score: number
}

export async function globalSearch(query: string, userId?: string, guestId?: string): Promise<SearchResult[]> {
  if (!query || query.trim().length < 2) return []
  const q = query.trim().toLowerCase()
  const cacheKey = `search:${q}`
  const cached = await cacheGet<SearchResult[]>(cacheKey)
  if (cached) return cached

  const [lessons, exams, questions, signs, faqs] = await Promise.all([
    prisma.lesson.findMany({
      where: {
        OR: [
          { title: { contains: q } },
          { summary: { contains: q } },
          { description: { contains: q } },
        ],
        isPublished: true,
      },
      take: 10,
      include: { topic: true },
    }),
    prisma.exam.findMany({
      where: {
        OR: [{ title: { contains: q } }, { description: { contains: q } }],
        isPublished: true,
      },
      take: 5,
    }),
    prisma.question.findMany({
      where: { stem: { contains: q }, isPublished: true },
      take: 5,
      include: { topic: true },
    }),
    prisma.trafficSign.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { code: { contains: q } },
          { description: { contains: q } },
        ],
      },
      take: 5,
    }),
    prisma.fAQ.findMany({
      where: {
        OR: [{ question: { contains: q } }, { answer: { contains: q } }],
        isPublished: true,
      },
      take: 5,
    }),
  ])

  const results: SearchResult[] = []
  for (const l of lessons) {
    results.push({
      type: 'lesson', id: l.id, title: l.title, subtitle: l.topic.name,
      url: `/lessons/${l.id}`, score: 1.0,
    })
  }
  for (const e of exams) {
    results.push({
      type: 'exam', id: e.id, title: e.title, subtitle: `${e.questionCount} vragen`,
      url: `/exams/${e.id}`, score: 0.9,
    })
  }
  for (const q of questions) {
    results.push({
      type: 'question', id: q.id, title: q.stem.slice(0, 80) + (q.stem.length > 80 ? '...' : ''),
      subtitle: q.topic.name, url: `/lessons`, score: 0.7,
    })
  }
  for (const s of signs) {
    results.push({
      type: 'sign', id: s.id, title: `${s.code} — ${s.name}`, subtitle: s.category,
      url: `/traffic-signs/${s.id}`, score: 0.8,
    })
  }
  for (const f of faqs) {
    results.push({
      type: 'faq', id: f.id, title: f.question, subtitle: 'FAQ',
      url: `/#faq`, score: 0.6,
    })
  }

  results.sort((a, b) => b.score - a.score)
  await cacheSet(cacheKey, results, 300) // cache 5 min

  // Track search
  await prisma.searchHistory.create({
    data: {
      userId: userId ?? null,
      guestId: guestId ?? null,
      query: q,
      resultsCount: results.length,
    },
  }).catch(() => {})
  // Bump popular search
  try {
    const existing = await prisma.popularSearch.findUnique({ where: { query: q } })
    if (existing) {
      await prisma.popularSearch.update({ where: { id: existing.id }, data: { count: { increment: 1 } } })
    } else {
      await prisma.popularSearch.create({ data: { query: q } })
    }
  } catch {}

  return results.slice(0, 20)
}

export async function getPopularSearches(limit = 10): Promise<string[]> {
  const items = await prisma.popularSearch.findMany({
    orderBy: { count: 'desc' },
    take: limit,
  })
  return items.map((i) => i.query)
}

export async function getUserSearchHistory(userId: string, limit = 10): Promise<string[]> {
  const items = await prisma.searchHistory.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    distinct: ['query'],
  })
  return items.map((i) => i.query)
}
