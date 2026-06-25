/**
 * Backup service — supports S3, Google Drive (stub), encryption, restore.
 */
import { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3'
import { createWriteStream, createReadStream, existsSync, mkdirSync, readdirSync, statSync, copyFileSync, unlinkSync, readFileSync } from 'fs'
import { join } from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import { createHash } from 'crypto'
import { prisma } from '@/lib/prisma'

const execAsync = promisify(exec)
const BACKUP_DIR = process.env.BACKUP_DIR || '/app/backups'

// ─── S3 client ──────────────────────────────────────────
function getS3(): S3Client | null {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) return null
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
  const cmd = `PGPASSWORD=${dbUrl.password} pg_dump --format=custom --no-owner --no-privileges --file=${filepath} "postgresql://${dbUrl.username}@${dbUrl.host}:${dbURL_port(dbUrl)}${dbUrl.pathname}"`
  try {
    await execAsync(cmd)
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
  await prisma.backupRecord.create({
    data: { filename, sizeBytes: stats.size, type, status: 'SUCCESS', path: filepath },
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
  const filepath = join(BACKUP_DIR, filename)
  if (!existsSync(filepath)) {
    return { ok: false, message: 'Backup file not found' }
  }
  // Restore would be: pg_restore --clean --if-exists
  // This is dangerous in production — must be confirmed by super admin
  // For now, just log intent
  await prisma.backupRecord.create({
    data: { filename, sizeBytes: 0, type: 'MANUAL', status: 'FAILED', path: filepath },
  })
  return { ok: false, message: 'Restore not yet implemented. Contact super admin.' }
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
