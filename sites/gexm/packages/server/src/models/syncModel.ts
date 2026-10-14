import { getDb } from '../models'
import { generateId } from '../utils/response'

type SyncStatus = 'pending' | 'success' | 'failed'
type SyncAction = 'create' | 'update' | 'delete'

interface SyncRecord {
  id: string
  user_id: string
  table_name: string
  record_id: string
  action: SyncAction
  sync_status: SyncStatus
  timestamp: number
  retry_count: number
  created_at: string
}

interface CreateSyncRecordData {
  tableName: string
  recordId: string
  action: SyncAction
  syncStatus?: SyncStatus
  timestamp?: number
}

const syncModel = {
  createRecord(userId: string, data: CreateSyncRecordData): SyncRecord | null {
    const db = getDb()
    const now = new Date().toISOString()
    const id = generateId()

    db.prepare(
      `
      INSERT INTO sync_records (id, user_id, table_name, record_id, action, sync_status, timestamp, retry_count, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      id,
      userId,
      data.tableName,
      data.recordId,
      data.action,
      data.syncStatus || 'pending',
      data.timestamp || Date.now(),
      0,
      now
    )

    return this.findById(id)
  },

  findById(id: string): SyncRecord | null {
    const db = getDb()
    const result = db.prepare('SELECT * FROM sync_records WHERE id = ?').get(id) as
      SyncRecord | undefined
    return result || null
  },

  getPendingRecords(userId: string): SyncRecord[] {
    const db = getDb()
    return db
      .prepare(
        `
      SELECT * FROM sync_records
      WHERE user_id = ? AND sync_status = 'pending'
      ORDER BY timestamp ASC
    `
      )
      .all(userId) as SyncRecord[]
  },

  updateStatus(id: string, status: SyncStatus, retryCount: number = 0): void {
    const db = getDb()
    db.prepare('UPDATE sync_records SET sync_status = ?, retry_count = ? WHERE id = ?').run(
      status,
      retryCount,
      id
    )
  },

  getLastSyncTimestamp(userId: string): number {
    const db = getDb()
    const result = db
      .prepare(
        `
      SELECT MAX(timestamp) as max_timestamp
      FROM sync_records
      WHERE user_id = ? AND sync_status = 'success'
    `
      )
      .get(userId) as { max_timestamp: number | null }
    return result.max_timestamp || 0
  },

  deleteRecord(id: string): boolean {
    const db = getDb()
    const result = db.prepare('DELETE FROM sync_records WHERE id = ?').run(id)
    return result.changes > 0
  },

  clearOldRecords(userId: string, days: number = 30): number {
    const db = getDb()
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
    const result = db
      .prepare(
        `
      DELETE FROM sync_records
      WHERE user_id = ? AND timestamp < ? AND sync_status = 'success'
    `
      )
      .run(userId, cutoff)
    return result.changes
  },
}

export default syncModel
