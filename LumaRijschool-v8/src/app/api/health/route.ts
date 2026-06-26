import { NextResponse } from 'next/server'
import { redisHealth } from '@/lib/redis'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const checks: Record<string, { ok: boolean; latencyMs?: number; error?: string }> = {}

  // Database
  try {
    const start = Date.now()
    await prisma.$queryRaw`SELECT 1`
    checks.database = { ok: true, latencyMs: Date.now() - start }
  } catch (e: any) {
    checks.database = { ok: false, error: e.message }
  }

  // Redis
  checks.redis = await redisHealth()

  // Overall
  const allOk = Object.values(checks).every((c) => c.ok)
  return NextResponse.json({
    ok: allOk,
    service: 'lumarijschool',
    version: '8.0.0',
    timestamp: new Date().toISOString(),
    checks,
  }, { status: allOk ? 200 : 503 })
}
