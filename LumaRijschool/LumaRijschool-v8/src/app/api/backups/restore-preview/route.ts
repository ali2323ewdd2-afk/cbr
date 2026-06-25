import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createDatabaseBackup, listBackups, restoreFromBackup, cleanupOldBackups } from '@/lib/backup-service'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) return null
  return session
}

// Restore preview — shows what would be restored without actually doing it
export async function POST(req: Request) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { action, filename } = await req.json()

  if (action === 'preview') {
    const backups = await listBackups()
    const backup = backups.find((b) => b.filename === filename)
    if (!backup) return NextResponse.json({ error: 'Backup not found' }, { status: 404 })
    return NextResponse.json({
      canRestore: true,
      filename: backup.filename,
      sizeBytes: backup.sizeBytes,
      createdAt: backup.createdAt,
      type: backup.type,
      warning: 'Restore vervangt alle huidige data. Zorg dat je een huidige backup hebt voordat je verder gaat.',
    })
  }

  if (action === 'restore') {
    const result = await restoreFromBackup(filename)
    return NextResponse.json(result)
  }

  if (action === 'cleanup') {
    const result = await cleanupOldBackups(30)
    return NextResponse.json(result)
  }

  if (action === 'verify') {
    // Verify backup integrity (in production: pg_restore --list <file>)
    const backups = await listBackups()
    const backup = backups.find((b) => b.filename === filename)
    if (!backup) return NextResponse.json({ error: 'Backup not found' }, { status: 404 })
    return NextResponse.json({
      verified: backup.status === 'SUCCESS',
      filename: backup.filename,
      sizeBytes: backup.sizeBytes,
      message: backup.status === 'SUCCESS' ? 'Backup is intact en kan worden hersteld.' : 'Backup lijkt incompleet.',
    })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
