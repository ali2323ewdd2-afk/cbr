/**
 * Rate limiting middleware helpers (Redis-backed).
 */
import { rateLimit } from '@/lib/redis'
import { NextResponse } from 'next/server'

interface RateConfig {
  limit: number
  windowSec: number
}

const PRESETS: Record<string, RateConfig> = {
  AUTH: { limit: 5, windowSec: 60 },       // 5/min for login/register
  API: { limit: 60, windowSec: 60 },        // 60/min for general API
  TUTOR: { limit: 15, windowSec: 3600 },    // 15/hour for AI tutor
  EXAM_SUBMIT: { limit: 5, windowSec: 300 }, // 5/5min for exam submits
  PAYMENT: { limit: 5, windowSec: 300 },    // 5/5min for payments
}

export async function applyRateLimit(
  req: Request,
  preset: keyof typeof PRESETS,
  identifier?: string,
): Promise<NextResponse | null> {
  const cfg = PRESETS[preset]
  const ip = (req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown').split(',')[0]
  const id = identifier ?? ip
  const key = `${preset}:${id}`

  const result = await rateLimit(key, cfg.limit, cfg.windowSec)
  if (!result.allowed) {
    return NextResponse.json(
      { error: 'Te veel verzoeken. Probeer het later opnieuw.', retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000) },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(cfg.limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(result.resetAt),
          'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)),
        },
      },
    )
  }
  return null
}
