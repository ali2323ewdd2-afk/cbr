import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { existsSync, readdirSync, statSync, createReadStream } from 'fs'
import { join } from 'path'
import { Readable } from 'stream'
import { backupPath, createDatabaseBackup, restoreFromBackup, verifyBackup } from '@/lib/backup-service'
import { requireAdminOnlySession } from '@/lib/admin-api'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPPORT')) return null
  return session
}

const BACKUP_DIR = process.env.BACKUP_DIR || '/app/backups'

export async function GET(req: Request) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const url = new URL(req.url)
  const download = url.searchParams.get('download')
  if (download) {
    const adminSession = await requireAdminOnlySession()
    if (!adminSession) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const filepath = backupPath(download)
    if (!existsSync(filepath)) return NextResponse.json({ error: 'Backup not found' }, { status: 404 })
    const stream = Readable.toWeb(createReadStream(filepath)) as ReadableStream
    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${download}"`,
      },
    })
  }

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

export async function POST(req: Request) {
  const session = await requireAdminOnlySession()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const body = await req.json().catch(() => ({})) as { action?: string; filename?: string; confirmation?: string }
    if (body.action === 'VERIFY' && body.filename) {
      return NextResponse.json(await verifyBackup(body.filename))
    }
    if (body.action === 'RESTORE' && body.filename) {
      if (body.confirmation !== 'RESTORE') {
        return NextResponse.json({ error: 'Restore confirmation is required' }, { status: 400 })
      }
      return NextResponse.json(await restoreFromBackup(body.filename))
    }
    const result = await createDatabaseBackup('MANUAL')
    return NextResponse.json({ ok: true, ...result }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Backup action failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
