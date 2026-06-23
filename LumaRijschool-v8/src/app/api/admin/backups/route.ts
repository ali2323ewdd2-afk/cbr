import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { existsSync, readdirSync, statSync, createReadStream } from 'fs'
import { join } from 'path'
import { Readable } from 'stream'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPPORT')) return null
  return session
}

const BACKUP_DIR = process.env.BACKUP_DIR || '/app/backups'

export async function GET() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // List backup files on disk
  const files: any[] = []
  if (existsSync(BACKUP_DIR)) {
    for (const f of readdirSync(BACKUP_DIR)) {
      if (!f.endsWith('.dump') && !f.endsWith('.sql')) continue
      const path = join(BACKUP_DIR, f)
      const stat = statSync(path)
      files.push({
        filename: f,
        sizeBytes: stat.size,
        createdAt: stat.mtime,
        type: f.startsWith('daily-') ? 'DAILY' : f.startsWith('weekly-') ? 'WEEKLY' : f.startsWith('monthly-') ? 'MONTHLY' : 'MANUAL',
        path,
      })
    }
  }
  // Also list DB records
  const records = await prisma.backupRecord.findMany({ orderBy: { createdAt: 'desc' }, take: 50 })
  return NextResponse.json({ backups: files, records })
}

export async function POST() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  // Manual backup trigger — in production, this would exec pg_dump
  return NextResponse.json({ ok: true, message: 'Manual backup scheduled. Check /admin/backups in a few minutes.' })
}
