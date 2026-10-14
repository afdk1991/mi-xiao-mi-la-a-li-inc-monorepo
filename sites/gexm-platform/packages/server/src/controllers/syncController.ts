// @ts-nocheck
import type { Request, Response } from 'express'
import syncModel from '../models/syncModel'
import { successResponse } from '../utils/response'
import logger from '../utils/logger'

interface SyncRecord {
  id: string
  tableName: string
  recordId: string
  action: string
  syncStatus: string
  timestamp: number
}

interface PushRecord {
  id?: string
  tableName: string
  recordId: string
  action: string
  timestamp?: number
}

interface PushResult {
  id: string
  success: boolean
  syncId?: string
  error?: string
}

const syncController = {
  async pull(req: Request, res: Response): Promise<Response> {
    const userId = (req as Request & { userId?: string }).userId || ''
    const lastSyncTimestamp = syncModel.getLastSyncTimestamp(userId)
    const pendingRecords = syncModel.getPendingRecords(userId)

    return successResponse(
      res,
      {
        lastSyncTime: lastSyncTimestamp,
        records: pendingRecords,
      },
      '拉取成功'
    )
  },

  async push(req: Request, res: Response): Promise<Response> {
    const { records = [] } = req.body as { records?: PushRecord[] }
    const userId = (req as Request & { userId?: string }).userId || ''

    const results: PushResult[] = []
    for (const record of records) {
      try {
        const syncRecord = syncModel.createRecord(userId, {
          tableName: record.tableName,
          recordId: record.recordId,
          action: record.action as 'create' | 'update' | 'delete',
          syncStatus: 'success',
          timestamp: record.timestamp || Date.now(),
        }) as unknown as SyncRecord
        results.push({ id: record.id || record.recordId, success: true, syncId: syncRecord.id })
      } catch (error) {
        logger.error('Sync push error: %s', (error as Error).message)
        results.push({
          id: record.id || record.recordId,
          success: false,
          error: (error as Error).message,
        })
      }
    }

    return successResponse(res, { results }, '推送完成')
  },

  async getStatus(req: Request, res: Response): Promise<Response> {
    const userId = (req as Request & { userId?: string }).userId || ''
    const lastSyncTime = syncModel.getLastSyncTimestamp(userId)
    const pendingRecords = syncModel.getPendingRecords(userId)

    return successResponse(
      res,
      {
        lastSyncTime,
        pendingCount: pendingRecords.length,
        isSyncing: false,
      },
      '获取成功'
    )
  },

  async clearOldRecords(req: Request, res: Response): Promise<Response> {
    const { days = 30 } = req.body
    const userId = (req as Request & { userId?: string }).userId || ''
    const count = syncModel.clearOldRecords(userId, parseInt(String(days), 10))
    return successResponse(res, { count }, `已清理 ${count} 条历史记录`)
  },
}

export default syncController
