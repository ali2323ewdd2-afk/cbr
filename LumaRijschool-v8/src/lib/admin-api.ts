import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { ZodError, type ZodSchema } from 'zod'
import { authOptions } from '@/lib/auth'

export type AdminSession = NonNullable<Awaited<ReturnType<typeof getServerSession>>>

export async function requireAdminSession() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPPORT')) {
    return null
  }
  return session
}

export async function requireAdminOnlySession() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return null
  }
  return session
}

export function forbiddenResponse() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

export function badRequestResponse(message: string, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status: 400 })
}

export function serverErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : 'Unexpected server error'
  return NextResponse.json({ error: message }, { status: 500 })
}

export function parsePagination(url: URL, defaults: { pageSize?: number; maxPageSize?: number } = {}) {
  const page = Math.max(1, Number.parseInt(url.searchParams.get('page') ?? '1', 10) || 1)
  const requestedPageSize = Number.parseInt(url.searchParams.get('pageSize') ?? String(defaults.pageSize ?? 20), 10)
  const maxPageSize = defaults.maxPageSize ?? 100
  const pageSize = Math.min(Math.max(1, requestedPageSize || defaults.pageSize || 20), maxPageSize)
  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
  }
}

export async function readJson<T>(req: Request, schema: ZodSchema<T>) {
  try {
    const body = await req.json()
    return { data: schema.parse(body), error: null as null }
  } catch (error) {
    if (error instanceof ZodError) {
      return { data: null, error: badRequestResponse('Validation failed', error.flatten()) }
    }
    return { data: null, error: badRequestResponse('Invalid JSON body') }
  }
}

export function slugify(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return normalized || `item-${Date.now()}`
}
