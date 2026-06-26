/**
 * SEO helpers — sitemap, robots.txt, schema.org JSON-LD.
 */
import { prisma } from '@/lib/prisma'

export async function generateSitemap(origin: string): Promise<string> {
  const staticPaths = [
    '', '/login', '/register', '/pricing', '/about', '/contact', '/faq',
  ]
  const [lessons, exams] = await Promise.all([
    prisma.lesson.findMany({ where: { isPublished: true }, select: { id: true, updatedAt: true } }),
    prisma.exam.findMany({ where: { isPublished: true }, select: { id: true, createdAt: true } }),
  ])

  const now = new Date().toISOString()
  const urls = [
    ...staticPaths.map((p) => `  <url><loc>${origin}${p}</loc><lastmod>${now}</lastmod><changefreq>weekly</changefreq><priority>${p === '' ? '1.0' : '0.8'}</priority></url>`),
    ...lessons.map((l) => `  <url><loc>${origin}/lessons/${l.id}</loc><lastmod>${l.updatedAt.toISOString()}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`),
    ...exams.map((e) => `  <url><loc>${origin}/exams/${e.id}</loc><lastmod>${(e.createdAt || new Date()).toISOString()}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`),
  ]

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`
}

export function generateRobotsTxt(origin: string): string {
  return `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/admin
Disallow: /api/auth
Disallow: /dashboard
Disallow: /profile
Disallow: /support

Sitemap: ${origin}/sitemap.xml
`
}

// ─── Schema.org JSON-LD ─────────────────────────────────
export function courseSchema(course: { title: string; description: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: course.title,
    description: course.description,
    provider: {
      '@type': 'Organization',
      name: 'LumaRijschool',
      sameAs: process.env.NEXTAUTH_URL || 'https://lumatheorie.nl',
    },
  }
}

export function faqSchema(faqs: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  }
}

export function lessonSchema(lesson: { title: string; description: string; durationSec: number }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    name: lesson.title,
    description: lesson.description,
    timeRequired: `PT${Math.floor(lesson.durationSec / 60)}M`,
    provider: { '@type': 'Organization', name: 'LumaRijschool' },
  }
}
