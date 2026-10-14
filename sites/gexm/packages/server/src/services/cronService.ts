import { getDb } from '../models'
import logger from '../utils/logger'
import oauthStateModel from '../models/oauthStateModel'
import flashSaleModel from '../models/flashSaleModel'

let cronIntervals: NodeJS.Timeout[] = []

function cleanupExpiredVerifyCodes(): void {
  const db = getDb()
  const now = new Date().toISOString()
  const result = db.prepare('DELETE FROM verify_codes WHERE expires_at < ?').run(now)
  if (result.changes > 0) {
    logger.info('Cleaned up %d expired verification codes', result.changes)
  }
}

function cleanupExpiredTokens(): void {
  const db = getDb()
  const now = new Date().toISOString()
  const refreshResult = db.prepare('DELETE FROM refresh_tokens WHERE expires_at < ?').run(now)
  if (refreshResult.changes > 0) {
    logger.info('Cleaned up %d expired refresh tokens', refreshResult.changes)
  }
  const sensitiveResult = db
    .prepare('DELETE FROM sensitive_verify_tokens WHERE expires_at < ?')
    .run(now)
  if (sensitiveResult.changes > 0) {
    logger.info('Cleaned up %d expired sensitive tokens', sensitiveResult.changes)
  }
}

function cleanupOldLoginAttempts(): void {
  const db = getDb()
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  const result = db
    .prepare('DELETE FROM login_attempts WHERE last_attempt < ? AND attempts = 0')
    .run(twoHoursAgo)
  if (result.changes > 0) {
    logger.info('Cleaned up %d old login attempts', result.changes)
  }
}

function cancelTimeoutOrders(): void {
  const db = getDb()
  const now = new Date()
  const timeoutTime = new Date(now.getTime() - 30 * 60 * 1000).toISOString()

  const pendingOrders = db
    .prepare(
      `SELECT id, order_no, user_id FROM orders 
       WHERE status = 'pending' AND created_at <= ?`
    )
    .all(timeoutTime) as Array<{ id: string; order_no: string; user_id: string }>

  for (const order of pendingOrders) {
    db.prepare('UPDATE orders SET status = ?, cancelled_at = ?, updated_at = ? WHERE id = ?').run(
      'cancelled',
      now.toISOString(),
      now.toISOString(),
      order.id
    )
    logger.info('Auto-cancelled order: %s', order.order_no)
  }
}

function cleanupExpiredOAuthStates(): void {
  oauthStateModel.cleanupExpired()
  logger.debug('Cleaned up expired OAuth states')
}

function syncFlashSaleStatus(): void {
  flashSaleModel.syncStatus()
  logger.debug('Flash sale status synchronized')
}

export function init(): void {
  cronIntervals.push(setInterval(cleanupExpiredVerifyCodes, 5 * 60 * 1000))
  cronIntervals.push(setInterval(cleanupExpiredTokens, 60 * 60 * 1000))
  cronIntervals.push(setInterval(cleanupOldLoginAttempts, 60 * 60 * 1000))
  cronIntervals.push(setInterval(cancelTimeoutOrders, 1 * 60 * 1000))
  cronIntervals.push(setInterval(cleanupExpiredOAuthStates, 5 * 60 * 1000))
  cronIntervals.push(setInterval(syncFlashSaleStatus, 1 * 60 * 1000))
  syncFlashSaleStatus()
  logger.info('Cron service initialized: cleanup tasks scheduled')
}

export function shutdown(): void {
  for (const interval of cronIntervals) {
    clearInterval(interval)
  }
  cronIntervals = []
  logger.info('Cron service shutdown: all tasks stopped')
}

export function startCronJobs(): void {
  init()
}

export default {
  cleanupExpiredVerifyCodes,
  cleanupExpiredTokens,
  cleanupOldLoginAttempts,
  cancelTimeoutOrders,
  startCronJobs,
  init,
  shutdown,
}
