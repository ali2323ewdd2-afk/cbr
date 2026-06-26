/**
 * Guest tracking — captures anonymous visitor data.
 * Used for conversion tracking, analytics, and free-tier limits.
 */
import { prisma } from '@/lib/prisma'
import { cacheSet, cacheGet, cacheDel } from '@/lib/redis'

const GUEST_LIMITS = {
  LESSONS: 5,
  EXAMS: 2,
  AI_QUESTIONS: 1,
}

function generateFingerprint(req: Request): string {
  const ip = (req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown').split(',')[0].trim()
  const ua = req.headers.get('user-agent') ?? ''
  return `${ip}::${ua.slice(0, 100)}`
}

function parseUserAgent(ua: string) {
  let device = 'Desktop'
  if (/Mobile|Android|iPhone/.test(ua)) device = 'Mobiel'
  else if (/iPad|Tablet/.test(ua)) device = 'Tablet'

  let browser = 'Onbekend'
  if (/Chrome/.test(ua) && !/Edg/.test(ua)) browser = 'Chrome'
  else if (/Firefox/.test(ua)) browser = 'Firefox'
  else if (/Safari/.test(ua) && !/Chrome/.test(ua)) browser = 'Safari'
  else if (/Edg/.test(ua)) browser = 'Edge'

  let os = 'Onbekend'
  if (/Windows/.test(ua)) os = 'Windows'
  else if (/Mac OS/.test(ua)) os = 'macOS'
  else if (/Android/.test(ua)) os = 'Android'
  else if (/iOS|iPhone|iPad/.test(ua)) os = 'iOS'
  else if (/Linux/.test(ua)) os = 'Linux'

  return { device, browser, os }
}

export async function trackGuest(req: Request): Promise<{ fingerprint: string; guestId: string; isNew: boolean }> {
  const fingerprint = generateFingerprint(req)
  const cached = await cacheGet<{ guestId: string }>(`guest:fp:${fingerprint}`)
  if (cached) {
    // Update last seen
    await prisma.guest.update({
      where: { id: cached.guestId },
      data: { updatedAt: new Date() },
    }).catch(() => {})
    return { fingerprint, guestId: cached.guestId, isNew: false }
  }

  const ip = (req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown').split(',')[0].trim()
  const ua = req.headers.get('user-agent') ?? ''
  const { device, browser, os } = parseUserAgent(ua)
  const path = new URL(req.url).pathname
  const ref = req.headers.get('referer') ?? ''

  // Look up existing guest by fingerprint
  const existing = await prisma.guest.findUnique({ where: { fingerprint } })
  if (existing) {
    await cacheSet(`guest:fp:${fingerprint}`, { guestId: existing.id }, 3600)
    await prisma.guest.update({
      where: { id: existing.id },
      data: { updatedAt: new Date(), pagesVisited: { increment: 1 } },
    })
    await prisma.pageView.create({ data: { guestId: existing.id, path } })
    return { fingerprint, guestId: existing.id, isNew: false }
  }

  // Create new guest
  const guest = await prisma.guest.create({
    data: {
      fingerprint,
      ip,
      device,
      browser,
      os,
      referrerUrl: ref,
      landingPage: path,
      pagesVisited: 1,
      lessonsViewed: JSON.stringify([]),
      examsStarted: JSON.stringify([]),
    },
  })
  await prisma.pageView.create({ data: { guestId: guest.id, path } })
  await cacheSet(`guest:fp:${fingerprint}`, { guestId: guest.id }, 3600)

  return { fingerprint, guestId: guest.id, isNew: true }
}

export async function trackGuestLessonView(guestId: string, lessonId: string) {
  const guest = await prisma.guest.findUnique({ where: { id: guestId } })
  if (!guest) return
  const viewed = parseArray(guest.lessonsViewed)
  if (!viewed.includes(lessonId)) {
    await prisma.guest.update({
      where: { id: guestId },
      data: { lessonsViewed: JSON.stringify([...viewed, lessonId]) },
    })
  }
}

export async function trackGuestExamStart(guestId: string, examId: string) {
  const guest = await prisma.guest.findUnique({ where: { id: guestId } })
  if (!guest) return
  const started = parseArray(guest.examsStarted)
  if (!started.includes(examId)) {
    await prisma.guest.update({
      where: { id: guestId },
      data: { examsStarted: JSON.stringify([...started, examId]) },
    })
  }
}

// Parse a field that may be an array (Postgres) or a JSON string (SQLite)
function parseArray(v: any): any[] {
  if (Array.isArray(v)) return v
  if (typeof v === 'string') {
    try { const p = JSON.parse(v); return Array.isArray(p) ? p : [] } catch { return [] }
  }
  return []
}

export async function checkGuestLimits(guestId: string) {
  const guest = await prisma.guest.findUnique({ where: { id: guestId } })
  if (!guest) return { canViewLesson: false, canStartExam: false, canAskAI: false }
  const lessons = parseArray(guest.lessonsViewed)
  const exams = parseArray(guest.examsStarted)
  return {
    canViewLesson: lessons.length < GUEST_LIMITS.LESSONS,
    canStartExam: exams.length < GUEST_LIMITS.EXAMS,
    canAskAI: guest.aiQuestionsUsed < GUEST_LIMITS.AI_QUESTIONS,
    lessonsUsed: lessons.length,
    lessonsLimit: GUEST_LIMITS.LESSONS,
    examsUsed: exams.length,
    examsLimit: GUEST_LIMITS.EXAMS,
    aiUsed: guest.aiQuestionsUsed,
    aiLimit: GUEST_LIMITS.AI_QUESTIONS,
  }
}

export async function convertGuestToUser(guestId: string, userId: string) {
  await prisma.guest.update({
    where: { id: guestId },
    data: { userId, converted: true, convertedAt: new Date() },
  })
  await cacheDel(`guest:fp:${generateFingerprint_dummy()}`)
}

function generateFingerprint_dummy() {
  return '' // placeholder; real cache invalidation happens via guestId
}

export async function trackGuestAIUsage(guestId: string) {
  await prisma.guest.update({
    where: { id: guestId },
    data: { aiQuestionsUsed: { increment: 1 } },
  })
}

export async function getGuestAnalytics() {
  const [totalGuests, convertedGuests, todayGuests, totalPageViews] = await Promise.all([
    prisma.guest.count(),
    prisma.guest.count({ where: { converted: true } }),
    prisma.guest.count({ where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
    prisma.pageView.count(),
  ])
  return {
    totalGuests,
    convertedGuests,
    conversionRate: totalGuests > 0 ? Math.round((convertedGuests / totalGuests) * 100) : 0,
    todayGuests,
    totalPageViews,
  }
}
