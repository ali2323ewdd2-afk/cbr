/**
 * LumaRijschool — Database Backup Script
 * - Copies SQLite DB file to BACKUP_DIR with timestamp
 * - Cleans up backups older than BACKUP_RETENTION_DAYS
 * - Prints a summary
 *
 * Usage: bun run scripts/backup.ts
 * In production: runs daily via cron (see docker-compose.yml)
 */
import { existsSync, mkdirSync, copyFileSync, readdirSync, statSync, unlinkSync } from 'fs'
import { join } from 'path'

const BACKUP_DIR = process.env.BACKUP_DIR || '/home/z/my-project/backups'
const RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS || '30')
const DB_PATH = process.env.DATABASE_URL?.replace('file:', '') || '/home/z/my-project/db/custom.db'

function main() {
  if (!existsSync(BACKUP_DIR)) mkdirSync(BACKUP_DIR, { recursive: true })

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const dest = join(BACKUP_DIR, `luma-${timestamp}.db`)

  if (!existsSync(DB_PATH)) {
    console.error(`❌ DB file not found: ${DB_PATH}`)
    process.exit(1)
  }

  copyFileSync(DB_PATH, dest)
  console.log(`✅ Backup created: ${dest}`)

  // Cleanup old backups
  const cutoff = Date.now() - RETENTION_DAYS * 86400000
  let removed = 0
  for (const file of readdirSync(BACKUP_DIR)) {
    if (!file.startsWith('luma-') || !file.endsWith('.db')) continue
    const path = join(BACKUP_DIR, file)
    const stat = statSync(path)
    if (stat.mtimeMs < cutoff) {
      unlinkSync(path)
      removed++
      console.log(`  🗑️  removed old backup: ${file}`)
    }
  }

  // Summary
  const all = readdirSync(BACKUP_DIR).filter((f) => f.startsWith('luma-'))
  console.log(`\n📊 Backup summary:`)
  console.log(`  Total backups: ${all.length}`)
  console.log(`  Removed: ${removed}`)
  console.log(`  Retention: ${RETENTION_DAYS} days`)
}

try {
  main()
} catch (e) {
  console.error('❌ Backup failed:', e)
  process.exit(1)
}
