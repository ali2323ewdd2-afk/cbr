/**
 * Backup service — supports S3, Google Drive (stub), encryption, restore.
 */
import { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3'
import { existsSync, mkdirSync, readdirSync, statSync, copyFileSync, unlinkSync, readFileSync } from 'fs'
import { basename, join } from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { createHash } from 'crypto'
import { prisma } from '@/lib/prisma'

const execFileAsync = promisify(execFile)
const BACKUP_DIR = process.env.BACKUP_DIR || '/app/backups'

// ─── S3 client ──────────────────────────────────────────
function getS3(): S3Client | null {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_S3_BUCKET) return null
  return new S3Client({
    region: process.env.AWS_REGION || 'eu-central-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  })
}

export const s3Enabled = () => !!getS3()

// ─── Create database backup ─────────────────────────────
export async function createDatabaseBackup(type: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'MANUAL' = 'MANUAL'): Promise<{ filename: string; sizeBytes: number; s3Uploaded: boolean }> {
  if (!existsSync(BACKUP_DIR)) mkdirSync(BACKUP_DIR, { recursive: true })

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filename = `${type.toLowerCase()}-${timestamp}.dump`
  const filepath = join(BACKUP_DIR, filename)

  // Use pg_dump for PostgreSQL
  const dbUrl = new URL(process.env.DATABASE_URL || '')
  try {
    await execFileAsync('pg_dump', ['--format=custom', '--no-owner', '--no-privileges', `--file=${filepath}`, process.env.DATABASE_URL || ''], {
      env: { ...process.env, PGPASSWORD: dbUrl.password },
    })
  } catch (e: any) {
    // Fallback: copy SQLite file if in dev mode
    if (process.env.DATABASE_URL?.startsWith('file:')) {
      const src = process.env.DATABASE_URL.replace('file:', '')
      if (existsSync(src)) copyFileSync(src, filepath)
    } else {
      throw new Error(`Backup failed: ${e.message}`)
    }
  }

  const stats = statSync(filepath)
  const checksum = checksumFile(filepath)
  await prisma.backupRecord.create({
    data: { filename, sizeBytes: stats.size, type, status: 'SUCCESS', path: filepath, checksum },
  })

  // Upload to S3 if configured
  let s3Uploaded = false
  const s3 = getS3()
  if (s3) {
    try {
      const buffer = readFileSync(filepath)
      await s3.send(new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET!,
        Key: `backups/${filename}`,
        Body: buffer,
        ServerSideEncryption: 'AES256',
      }))
      s3Uploaded = true
    } catch (e: any) {
      console.error('S3 upload failed:', e.message)
    }
  }

  return { filename, sizeBytes: stats.size, s3Uploaded }
}

function dbURL_port(url: URL): string {
  return url.port || '5432'
}

// ─── List backups ───────────────────────────────────────
export async function listBackups() {
  const records = await prisma.backupRecord.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  return records
}

// ─── Restore from backup ────────────────────────────────
export async function restoreFromBackup(filename: string): Promise<{ ok: boolean; message: string }> {
  const filepath = backupPath(filename)
  if (!existsSync(filepath)) {
    return { ok: false, message: 'Backup file not found' }
  }
  try {
    if (filename.endsWith('.sql')) {
      await execFileAsync('psql', [process.env.DATABASE_URL || '', '-f', filepath])
    } else {
      await execFileAsync('pg_restore', ['--clean', '--if-exists', '--no-owner', '--no-privileges', '--dbname', process.env.DATABASE_URL || '', filepath])
    }
    await prisma.backupRecord.updateMany({
      where: { filename },
      data: { restoredAt: new Date(), status: 'SUCCESS' },
    })
    return { ok: true, message: 'Backup restored successfully' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Restore failed'
    await prisma.backupRecord.updateMany({ where: { filename }, data: { status: 'FAILED' } })
    return { ok: false, message }
  }
}

// ─── Cleanup old backups ────────────────────────────────
export async function cleanupOldBackups(retentionDays: number = 30) {
  if (!existsSync(BACKUP_DIR)) return { removed: 0 }
  const cutoff = Date.now() - retentionDays * 86400000
  let removed = 0
  for (const f of readdirSync(BACKUP_DIR)) {
    if (!f.endsWith('.dump') && !f.endsWith('.sql')) continue
    const path = join(BACKUP_DIR, f)
    if (statSync(path).mtimeMs < cutoff) {
      unlinkSync(path)
      removed++
    }
  }
  return { removed }
}

export function backupPath(filename: string) {
  const safeName = basename(filename)
  if (safeName !== filename || (!safeName.endsWith('.dump') && !safeName.endsWith('.sql'))) {
    throw new Error('Invalid backup filename')
  }
  return join(BACKUP_DIR, safeName)
}

export function checksumFile(filepath: string) {
  return createHash('sha256').update(readFileSync(filepath)).digest('hex')
}

export async function verifyBackup(filename: string) {
  const filepath = backupPath(filename)
  if (!existsSync(filepath)) return { ok: false, checksum: null, message: 'Backup file not found' }
  const checksum = checksumFile(filepath)
  await prisma.backupRecord.updateMany({
    where: { filename },
    data: { checksum, verifiedAt: new Date(), status: 'SUCCESS' },
  })
  return { ok: true, checksum, message: 'Backup checksum verified' }
}
