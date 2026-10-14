import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { getDb } from '../models'
import config from '../config'
import logger from './logger'

const BACKUP_DIR = path.join(process.cwd(), 'data', 'backups')
const MAX_BACKUPS = 14
const fsPromises = fs.promises

interface BackupInfo {
  filename: string
  path: string
  size: number
  created_at: string
}

async function ensureBackupDir(): Promise<void> {
  try {
    await fsPromises.access(BACKUP_DIR)
  } catch {
    await fsPromises.mkdir(BACKUP_DIR, { recursive: true })
  }
}

function isBackupFile(filename: string): boolean {
  return (
    filename.startsWith('gexm-backup-') && (filename.endsWith('.db') || filename.endsWith('.sql'))
  )
}

export async function createBackup(): Promise<BackupInfo> {
  await ensureBackupDir()
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const dbName = config.database.database || 'gexm'

  if (config.database.type === 'postgres') {
    return await createPostgresBackup(dbName, timestamp)
  }

  return await createSqliteBackup(dbName, timestamp)
}

async function createSqliteBackup(dbName: string, timestamp: string): Promise<BackupInfo> {
  const db = getDb()
  const backupName = `gexm-backup-${dbName}-${timestamp}.db`
  const backupPath = path.join(BACKUP_DIR, backupName)

  try {
    db.exec('BEGIN IMMEDIATE;')
    const dbPath = path.resolve(config.database.path)
    await fsPromises.copyFile(dbPath, backupPath)
    db.exec('COMMIT;')

    const stats = await fsPromises.stat(backupPath)
    logger.info(`Database backup created: ${backupName} (${(stats.size / 1024).toFixed(2)} KB)`)

    await cleanupOldBackups()

    return {
      filename: backupName,
      path: backupPath,
      size: stats.size,
      created_at: new Date().toISOString(),
    }
  } catch (error) {
    try {
      db.exec('ROLLBACK;')
    } catch {
      // ignore rollback errors
    }
    logger.error('Database backup failed:', (error as Error).message)
    throw error
  }
}

async function createPostgresBackup(dbName: string, timestamp: string): Promise<BackupInfo> {
  const backupName = `gexm-backup-${dbName}-${timestamp}.sql`
  const backupPath = path.join(BACKUP_DIR, backupName)
  const { host, port, username, password, database } = config.database

  try {
    const env = { ...process.env, PGPASSWORD: password }
    execSync(
      `pg_dump -h ${host} -p ${port} -U ${username} -d ${database} -f "${backupPath}" -F p`,
      { env, stdio: 'pipe' }
    )

    const stats = await fsPromises.stat(backupPath)
    logger.info(`PostgreSQL backup created: ${backupName} (${(stats.size / 1024).toFixed(2)} KB)`)

    await cleanupOldBackups()

    return {
      filename: backupName,
      path: backupPath,
      size: stats.size,
      created_at: new Date().toISOString(),
    }
  } catch (error) {
    logger.error('PostgreSQL backup failed:', (error as Error).message)
    throw error
  }
}

async function cleanupOldBackups(): Promise<void> {
  try {
    const files = await fsPromises.readdir(BACKUP_DIR)
    const backupFiles = files.filter(isBackupFile).sort().reverse()

    if (backupFiles.length > MAX_BACKUPS) {
      const toDelete = backupFiles.slice(MAX_BACKUPS)
      for (const file of toDelete) {
        const filePath = path.join(BACKUP_DIR, file)
        await fsPromises.unlink(filePath)
        logger.info(`Old backup removed: ${file}`)
      }
    }
  } catch (error) {
    logger.error('Backup cleanup failed:', (error as Error).message)
  }
}

export async function listBackups(): Promise<BackupInfo[]> {
  await ensureBackupDir()
  const files = await fsPromises.readdir(BACKUP_DIR)
  const backupFiles = files.filter(isBackupFile).sort().reverse()

  const result: BackupInfo[] = []
  for (const file of backupFiles) {
    const filePath = path.join(BACKUP_DIR, file)
    const stats = await fsPromises.stat(filePath)
    result.push({
      filename: file,
      size: stats.size,
      created_at: stats.mtime.toISOString(),
      path: filePath,
    })
  }
  return result
}

export async function restoreBackup(
  backupFilename: string
): Promise<{ success: boolean; restored_from: string }> {
  await ensureBackupDir()
  const backupPath = path.join(BACKUP_DIR, backupFilename)

  try {
    await fsPromises.access(backupPath)
  } catch {
    throw new Error('备份文件不存在')
  }

  const timestamp = Date.now()

  if (config.database.type === 'postgres') {
    return await restorePostgresBackup(backupPath, backupFilename, timestamp)
  }

  return await restoreSqliteBackup(backupPath, backupFilename, timestamp)
}

async function restoreSqliteBackup(
  backupPath: string,
  backupFilename: string,
  timestamp: number
): Promise<{ success: boolean; restored_from: string }> {
  const dbPath = path.resolve(config.database.path)
  const dbName = config.database.database || 'gexm'
  const currentBackup = path.join(BACKUP_DIR, `pre-restore-${dbName}-${timestamp}.db`)

  try {
    await fsPromises.copyFile(dbPath, currentBackup)
    logger.info(`Pre-restore backup saved: pre-restore-${dbName}-${timestamp}.db`)
  } catch (error) {
    logger.error('Pre-restore backup failed:', (error as Error).message)
  }

  try {
    await fsPromises.copyFile(backupPath, dbPath)
    logger.info(`Database restored from: ${backupFilename}`)
    return { success: true, restored_from: backupFilename }
  } catch (error) {
    logger.error('Database restore failed:', (error as Error).message)
    throw error
  }
}

async function restorePostgresBackup(
  backupPath: string,
  backupFilename: string,
  timestamp: number
): Promise<{ success: boolean; restored_from: string }> {
  const { host, port, username, password, database } = config.database
  const preRestoreName = `pre-restore-${database}-${timestamp}.sql`
  const preRestorePath = path.join(BACKUP_DIR, preRestoreName)

  // 创建恢复前的备份
  try {
    const env = { ...process.env, PGPASSWORD: password }
    execSync(
      `pg_dump -h ${host} -p ${port} -U ${username} -d ${database} -f "${preRestorePath}" -F p`,
      { env, stdio: 'pipe' }
    )
    logger.info(`Pre-restore backup saved: ${preRestoreName}`)
  } catch (error) {
    logger.error('Pre-restore backup failed:', (error as Error).message)
  }

  // 从备份文件恢复
  try {
    const env = { ...process.env, PGPASSWORD: password }
    execSync(
      `psql -h ${host} -p ${port} -U ${username} -d ${database} -f "${backupPath}"`,
      { env, stdio: 'pipe' }
    )
    logger.info(`Database restored from: ${backupFilename}`)
    return { success: true, restored_from: backupFilename }
  } catch (error) {
    logger.error('Database restore failed:', (error as Error).message)
    throw error
  }
}

export async function deleteBackup(
  backupFilename: string
): Promise<{ success: boolean; deleted: string }> {
  await ensureBackupDir()
  const backupPath = path.join(BACKUP_DIR, backupFilename)

  try {
    await fsPromises.access(backupPath)
  } catch {
    throw new Error('备份文件不存在')
  }

  await fsPromises.unlink(backupPath)
  logger.info(`Backup deleted: ${backupFilename}`)
  return { success: true, deleted: backupFilename }
}

let backupIntervalId: ReturnType<typeof setInterval> | null = null

export function startAutoBackup(intervalMs: number = 24 * 60 * 60 * 1000): void {
  if (backupIntervalId) {
    stopAutoBackup()
  }

  const runBackup = () => {
    createBackup().catch((error) => {
      logger.error('Auto backup failed:', (error as Error).message)
    })
  }

  backupIntervalId = setInterval(runBackup, intervalMs)
  logger.info(`Auto backup started (interval: ${intervalMs / 1000 / 60 / 60} hours)`)

  setTimeout(runBackup, 5000)
}

export function stopAutoBackup(): void {
  if (backupIntervalId) {
    clearInterval(backupIntervalId)
    backupIntervalId = null
    logger.info('Auto backup stopped')
  }
}

export default {
  createBackup,
  listBackups,
  restoreBackup,
  deleteBackup,
  startAutoBackup,
  stopAutoBackup,
}
