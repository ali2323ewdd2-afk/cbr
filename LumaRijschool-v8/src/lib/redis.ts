/**
 * Redis client + helpers (caching, rate limiting, session store).
 * Falls back to in-memory when REDIS_URL is not set (dev mode).
 */
import Redis from 'ioredis'

let client: Redis | null = null
const memoryStore = new Map<string, { value: string; expiresAt?: number }>()

function getRedisUrl() {
  return process.env.REDIS_URL
}

function getClient(): Redis | null {
  if (!getRedisUrl()) return null
  if (!client) {
    client = new Redis(getRedisUrl()!, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
      retryStrategy: (times) => Math.min(times * 200, 2000),
    })
    client.on('error', (e) => console.error('[redis] error:', e.message))
  }
  return client
}

// ─── Cache helpers ──────────────────────────────────────
export async function cacheGet<T>(key: string): Promise<T | null> {
  const r = getClient()
  if (r) {
    const v = await r.get(key)
    return v ? JSON.parse(v) : null
  }
  // Memory fallback
  const item = memoryStore.get(key)
  if (!item) return null
  if (item.expiresAt && item.expiresAt < Date.now()) {
    memoryStore.delete(key)
    return null
  }
  return JSON.parse(item.value)
}

export async function cacheSet(key: string, value: any, ttlSeconds?: number): Promise<void> {
  const v = JSON.stringify(value)
  const r = getClient()
  if (r) {
    if (ttlSeconds) await r.set(key, v, 'EX', ttlSeconds)
    else await r.set(key, v)
    return
  }
  memoryStore.set(key, { value: v, expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined })
}

export async function cacheDel(key: string | string[]): Promise<void> {
  const r = getClient()
  if (r) {
    if (Array.isArray(key)) await r.del(...key)
    else await r.del(key)
    return
  }
  if (Array.isArray(key)) key.forEach((k) => memoryStore.delete(k))
  else memoryStore.delete(key)
}

export async function cacheInvalidatePattern(prefix: string): Promise<void> {
  const r = getClient()
  if (r) {
    const keys = await r.keys(`${prefix}*`)
    if (keys.length) await r.del(...keys)
    return
  }
  for (const k of memoryStore.keys()) {
    if (k.startsWith(prefix)) memoryStore.delete(k)
  }
}

// ─── Rate limiting ──────────────────────────────────────
export async function rateLimit(
  key: string,
  limit: number,
  windowSec: number,
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const r = getClient()
  if (r) {
    const k = `rl:${key}`
    const multi = r.multi()
    multi.incr(k)
    multi.expire(k, windowSec, 'NX')
    const results = await multi.exec()
    const count = results?.[0]?.[1] as number
    const ttl = await r.ttl(k)
    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      resetAt: Date.now() + (ttl > 0 ? ttl * 1000 : windowSec * 1000),
    }
  }
  // Memory fallback
  const mk = `rl:${key}`
  const item = memoryStore.get(mk)
  const now = Date.now()
  if (!item || (item.expiresAt && item.expiresAt < now)) {
    memoryStore.set(mk, { value: '1', expiresAt: now + windowSec * 1000 })
    return { allowed: true, remaining: limit - 1, resetAt: now + windowSec * 1000 }
  }
  const count = parseInt(item.value, 10) + 1
  item.value = String(count)
  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    resetAt: item.expiresAt ?? now + windowSec * 1000,
  }
}

// ─── Real-time pub/sub (for notifications via socket.io) ───
export async function publish(channel: string, message: any): Promise<void> {
  const r = getClient()
  if (r) await r.publish(channel, JSON.stringify(message))
}

export async function subscribe(channel: string, handler: (msg: any) => void): Promise<() => void> {
  const r = getClient()
  if (!r) return () => {}
  const sub = r.duplicate()
  await sub.subscribe(channel)
  sub.on('message', (_ch, msg) => {
    try { handler(JSON.parse(msg)) } catch {}
  })
  return () => { sub.unsubscribe(channel); sub.disconnect() }
}

export async function cacheKeys(pattern: string): Promise<string[]> {
  const r = getClient()
  if (r) return r.keys(pattern)
  return Array.from(memoryStore.keys()).filter((k) => k.includes(pattern.replace('*', '')))
}

// ─── Health ─────────────────────────────────────────────
export async function redisHealth(): Promise<{ ok: boolean; latencyMs?: number }> {
  const r = getClient()
  if (!r) return { ok: true } // memory fallback considered healthy
  try {
    const start = Date.now()
    await r.ping()
    return { ok: true, latencyMs: Date.now() - start }
  } catch {
    return { ok: false }
  }
}

// ─── AI Tutor history queue ─────────────────────────────
export async function pushTutorMessage(userId: string, msg: any): Promise<void> {
  const r = getClient()
  const k = `tutor:history:${userId}`
  if (r) {
    await r.rpush(k, JSON.stringify(msg))
    await r.ltrim(k, -50, -1) // keep last 50
  }
}

export async function getTutorHistory(userId: string, count = 20): Promise<any[]> {
  const r = getClient()
  if (!r) return []
  const items = await r.lrange(`tutor:history:${userId}`, -count, -1)
  return items.map((i) => JSON.parse(i))
}

// ─── Live visitors (for admin) ──────────────────────────
export async function trackLiveVisitor(fingerprint: string, path: string): Promise<void> {
  const r = getClient()
  if (!r) return
  await r.hset('live:visitors', fingerprint, JSON.stringify({ path, ts: Date.now() }))
  await r.expire('live:visitors', 60)
}

export async function getLiveVisitors(): Promise<{ count: number; paths: Record<string, number> }> {
  const r = getClient()
  if (!r) return { count: 0, paths: {} }
  const all = await r.hgetall('live:visitors')
  const now = Date.now()
  let count = 0
  const paths: Record<string, number> = {}
  for (const [fp, v] of Object.entries(all)) {
    try {
      const { path, ts } = JSON.parse(v)
      if (now - ts < 60000) {
        count++
        paths[path] = (paths[path] ?? 0) + 1
      } else {
        await r.hdel('live:visitors', fp)
      }
    } catch {}
  }
  return { count, paths }
}
