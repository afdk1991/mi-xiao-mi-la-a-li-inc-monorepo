import config from '../config'
import logger from '../utils/logger'
import { getDb } from '../models'
import { initDbClient } from '../models/dbClient'
import { postgresSchema, postgresDefaultData } from '../models/postgresSchema'

let isDualWriteEnabled = false
let postgresClient: ReturnType<typeof initDbClient> | null = null
let consistencyCheckTimer: NodeJS.Timeout | null = null

// 一致性检查历史记录
interface ConsistencyHistoryEntry {
  timestamp: Date
  allConsistent: boolean
  inconsistentTables: string[]
  summary: string
}

const consistencyHistory: ConsistencyHistoryEntry[] = []
const MAX_HISTORY_ENTRIES = 100

// 告警回调
type AlertCallback = (alert: {
  type: 'inconsistency' | 'repair_failed' | 'connection_error'
  message: string
  details?: unknown
  timestamp: Date
}) => void

const alertCallbacks: AlertCallback[] = []

/**
 * 注册告警回调函数
 */
export function onAlert(callback: AlertCallback): void {
  alertCallbacks.push(callback)
}

/**
 * 触发告警
 */
function triggerAlert(
  type: 'inconsistency' | 'repair_failed' | 'connection_error',
  message: string,
  details?: unknown
): void {
  const alert = { type, message, details, timestamp: new Date() }
  for (const cb of alertCallbacks) {
    try {
      cb(alert)
    } catch (err) {
      logger.error('Alert callback error:', (err as Error).message)
    }
  }
}

/**
 * 获取一致性检查历史
 */
export function getConsistencyHistory(): ConsistencyHistoryEntry[] {
  return [...consistencyHistory]
}

/**
 * 记录一致性检查结果
 */
function recordHistory(
  allConsistent: boolean,
  inconsistentTables: string[],
  summary: string
): void {
  consistencyHistory.push({
    timestamp: new Date(),
    allConsistent,
    inconsistentTables,
    summary,
  })
  if (consistencyHistory.length > MAX_HISTORY_ENTRIES) {
    consistencyHistory.shift()
  }
}

interface ConsistencyResult {
  consistent: boolean
  sqliteCount: number
  postgresCount: number
  diff?: ConsistencyDiff[]
  tableName: string
  checkedAt: Date
}

interface ConsistencyDiff {
  type: 'missing_in_postgres' | 'missing_in_sqlite' | 'content_mismatch'
  id?: string
  rowData?: Record<string, unknown>
  description: string
}

interface RepairResult {
  success: boolean
  repaired: number
  skipped: number
  errors: string[]
  tableName: string
}

export function enableDualWrite(): void {
  if (config.database.type !== 'postgres') {
    logger.warn('Dual write only available when using PostgreSQL')
    return
  }

  try {
    postgresClient = initDbClient()
    postgresClient.exec(postgresSchema)
    postgresClient.exec(postgresDefaultData)
    isDualWriteEnabled = true
    logger.info('Dual write mode enabled - writing to both SQLite and PostgreSQL')

    startConsistencyCheck()
  } catch (error) {
    logger.error('Failed to enable dual write: %s', (error as Error).message)
    throw error
  }
}

export function disableDualWrite(): void {
  isDualWriteEnabled = false

  if (consistencyCheckTimer) {
    clearInterval(consistencyCheckTimer)
    consistencyCheckTimer = null
  }

  if (postgresClient) {
    postgresClient.close()
    postgresClient = null
  }
  logger.info('Dual write mode disabled')
}

export function isDualWriteActive(): boolean {
  return isDualWriteEnabled && postgresClient !== null
}

function startConsistencyCheck(): void {
  if (consistencyCheckTimer) {
    clearInterval(consistencyCheckTimer)
  }

  const checkInterval = parseInt(process.env.DUAL_WRITE_CHECK_INTERVAL || '300000', 10)

  consistencyCheckTimer = setInterval(async () => {
    if (!isDualWriteEnabled) {
      return
    }

    logger.info('Starting periodic dual-write consistency check...')
    try {
      const result = await verifyAllTablesConsistency()
      const inconsistentTables = Object.entries(result.results)
        .filter(([, r]) => !r.consistent)
        .map(([name]) => name)

      recordHistory(result.allConsistent, inconsistentTables, result.summary)

      if (!result.allConsistent) {
        logger.warn('Data inconsistency detected during periodic check')
        triggerAlert(
          'inconsistency',
          `双写数据不一致: ${result.summary}`,
          { inconsistentTables, results: result.results }
        )
        await autoRepairInconsistencies(inconsistentTables)
      }
    } catch (error) {
      logger.error('Periodic consistency check failed: %s', (error as Error).message)
      triggerAlert('connection_error', `一致性检查失败: ${(error as Error).message}`)
    }
  }, checkInterval)

  logger.info(`Periodic consistency check scheduled every ${checkInterval}ms`)
}

export function dualWrite(sql: string, params?: unknown[]): void {
  if (!isDualWriteEnabled || !postgresClient) {
    return
  }

  try {
    const sqliteDb = getDb()

    let sqliteResult: unknown
    let postgresResult: unknown

    if (params && params.length > 0) {
      sqliteResult = sqliteDb.prepare(sql).run(...params)
      postgresResult = postgresClient.prepare(sql).run(...params)
    } else {
      sqliteResult = sqliteDb.prepare(sql).run()
      postgresResult = postgresClient.prepare(sql).run()
    }

    validateWriteResult(sql, sqliteResult, postgresResult)
  } catch (error) {
    logger.error('Dual write failed for SQL: %s, error: %s', sql, (error as Error).message)
    throw error
  }
}

function validateWriteResult(sql: string, sqliteResult: unknown, postgresResult: unknown): void {
  if (sql.toUpperCase().includes('INSERT')) {
    const sqliteChanges = (sqliteResult as { changes: number }).changes || 0
    const postgresChanges = (postgresResult as { changes: number }).changes || 0

    if (sqliteChanges !== postgresChanges) {
      logger.warn(
        `Insert row count mismatch: SQLite=${sqliteChanges}, PostgreSQL=${postgresChanges}`
      )
    }
  }
}

export function dualExec(sql: string): void {
  if (!isDualWriteEnabled || !postgresClient) {
    return
  }

  try {
    const sqliteDb = getDb()
    sqliteDb.exec(sql)
    postgresClient.exec(sql)
  } catch (error) {
    logger.error('Dual exec failed for SQL: %s, error: %s', sql, (error as Error).message)
    throw error
  }
}

export async function verifyDualWriteConsistency(
  tableName: string,
  detailed = false
): Promise<ConsistencyResult> {
  if (!isDualWriteEnabled || !postgresClient) {
    return { consistent: false, sqliteCount: 0, postgresCount: 0, tableName, checkedAt: new Date() }
  }

  try {
    const sqliteDb = getDb()

    const sqliteCount = sqliteDb.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get()
    const postgresResult = await postgresClient
      .prepare(`SELECT COUNT(*) as count FROM ${tableName}`)
      .get()

    const sqliteCountVal = (sqliteCount as { count: number }).count
    const postgresCountVal =
      typeof postgresResult === 'object' && postgresResult !== null
        ? (postgresResult as { count: number }).count
        : 0

    if (sqliteCountVal !== postgresCountVal) {
      logger.warn(
        `Data inconsistency detected in table ${tableName}: SQLite=${sqliteCountVal}, PostgreSQL=${postgresCountVal}`
      )

      const diff = detailed ? await compareTableRows(tableName) : undefined

      return {
        consistent: false,
        sqliteCount: sqliteCountVal,
        postgresCount: postgresCountVal,
        diff,
        tableName,
        checkedAt: new Date(),
      }
    }

    logger.info(`Table ${tableName} data consistent: ${sqliteCountVal} records`)
    return {
      consistent: true,
      sqliteCount: sqliteCountVal,
      postgresCount: postgresCountVal,
      tableName,
      checkedAt: new Date(),
    }
  } catch (error) {
    logger.error(
      'Failed to verify consistency for table %s: %s',
      tableName,
      (error as Error).message
    )
    return { consistent: false, sqliteCount: 0, postgresCount: 0, tableName, checkedAt: new Date() }
  }
}

async function compareTableRows(tableName: string): Promise<ConsistencyDiff[]> {
  const diffs: ConsistencyDiff[] = []

  try {
    const sqliteDb = getDb()

    const sqliteRows = sqliteDb.prepare(`SELECT * FROM ${tableName} ORDER BY id`).all() as Record<
      string,
      unknown
    >[]
    const postgresRows = (await postgresClient!
      .prepare(`SELECT * FROM ${tableName} ORDER BY id`)
      .all()) as Record<string, unknown>[]

    const sqliteIdMap = new Map<string, Record<string, unknown>>()
    const postgresIdMap = new Map<string, Record<string, unknown>>()

    for (const row of sqliteRows) {
      sqliteIdMap.set(String(row.id), row)
    }

    for (const row of postgresRows) {
      postgresIdMap.set(String(row.id), row)
    }

    for (const [id, sqliteRow] of sqliteIdMap) {
      if (!postgresIdMap.has(id)) {
        diffs.push({
          type: 'missing_in_postgres',
          id,
          rowData: sqliteRow,
          description: `Row with id=${id} exists in SQLite but missing in PostgreSQL`,
        })
      } else {
        const postgresRow = postgresIdMap.get(id)!
        const contentDiff = compareRowContent(sqliteRow, postgresRow)
        if (contentDiff) {
          diffs.push({
            type: 'content_mismatch',
            id,
            rowData: { sqlite: sqliteRow, postgres: postgresRow },
            description: `Row with id=${id} has content differences: ${contentDiff}`,
          })
        }
      }
    }

    for (const [id] of postgresIdMap) {
      if (!sqliteIdMap.has(id)) {
        diffs.push({
          type: 'missing_in_sqlite',
          id,
          description: `Row with id=${id} exists in PostgreSQL but missing in SQLite`,
        })
      }
    }

    if (diffs.length > 0) {
      logger.warn(`Table ${tableName} has ${diffs.length} differences`)
    }
  } catch (error) {
    logger.error('Failed to compare table rows for %s: %s', tableName, (error as Error).message)
  }

  return diffs
}

function compareRowContent(
  sqliteRow: Record<string, unknown>,
  postgresRow: Record<string, unknown>
): string | null {
  const differences: string[] = []

  for (const key of Object.keys(sqliteRow)) {
    const sqliteVal = sqliteRow[key]
    const postgresVal = postgresRow[key]

    if (sqliteVal !== postgresVal) {
      const sqliteStr =
        typeof sqliteVal === 'object' ? JSON.stringify(sqliteVal) : String(sqliteVal)
      const postgresStr =
        typeof postgresVal === 'object' ? JSON.stringify(postgresVal) : String(postgresVal)
      differences.push(`${key}: SQLite='${sqliteStr}' vs PostgreSQL='${postgresStr}'`)
    }
  }

  return differences.length > 0 ? differences.join('; ') : null
}

export async function verifyAllTablesConsistency(detailed = false): Promise<{
  allConsistent: boolean
  results: Record<string, ConsistencyResult>
  summary: string
}> {
  if (!isDualWriteEnabled) {
    return { allConsistent: false, results: {}, summary: 'Dual write not enabled' }
  }

  const tables = [
    'users',
    'refresh_tokens',
    'oauth_accounts',
    'oauth_states',
    'addresses',
    'cart_items',
    'orders',
    'order_items',
    'products',
    'product_skus',
    'product_images',
    'product_categories',
    'product_tags',
    'product_reviews',
    'coupons',
    'user_coupons',
    'wallet_transactions',
    'notifications',
    'announcements',
    'settings',
    'system_logs',
    'failed_jobs',
    'permissions',
    'roles',
    'role_permissions',
    'user_roles',
    'flash_sales',
    'flash_sale_items',
    'flash_sale_orders',
    'checkin_records',
  ]

  const results: Record<string, ConsistencyResult> = {}
  let allConsistent = true
  let inconsistentTables = 0
  let totalChecked = 0

  for (const table of tables) {
    try {
      const result = await verifyDualWriteConsistency(table, detailed)
      results[table] = result
      totalChecked++

      if (!result.consistent) {
        allConsistent = false
        inconsistentTables++
      }
    } catch (error) {
      logger.error('Failed to check table %s: %s', table, (error as Error).message)
      results[table] = {
        consistent: false,
        sqliteCount: 0,
        postgresCount: 0,
        tableName: table,
        checkedAt: new Date(),
      }
      allConsistent = false
      inconsistentTables++
    }
  }

  const summary = allConsistent
    ? `All ${totalChecked} tables consistent`
    : `${inconsistentTables}/${totalChecked} tables have data inconsistencies`

  if (allConsistent) {
    logger.info(`Dual-write consistency check passed: ${summary}`)
  } else {
    logger.error(`Dual-write consistency check failed: ${summary}`)
  }

  return { allConsistent, results, summary }
}

export async function repairTable(tableName: string): Promise<RepairResult> {
  if (!isDualWriteEnabled || !postgresClient) {
    return { success: false, repaired: 0, skipped: 0, errors: [], tableName }
  }

  const errors: string[] = []
  let repaired = 0
  let skipped = 0

  try {
    const result = await verifyDualWriteConsistency(tableName, true)

    if (result.consistent) {
      logger.info(`Table ${tableName} is already consistent, no repair needed`)
      return { success: true, repaired: 0, skipped: 0, errors: [], tableName }
    }

    if (!result.diff || result.diff.length === 0) {
      logger.warn(`Table ${tableName} has count mismatch but no detailed diffs available`)
      return {
        success: false,
        repaired: 0,
        skipped: 0,
        errors: ['No detailed diffs available'],
        tableName,
      }
    }

    const sqliteDb = getDb()

    for (const diff of result.diff) {
      try {
        if (diff.type === 'missing_in_postgres' && diff.rowData) {
          await insertMissingRow(tableName, diff.rowData)
          repaired++
        } else if (diff.type === 'missing_in_sqlite') {
          skipped++
        } else if (diff.type === 'content_mismatch' && diff.rowData && 'sqlite' in diff.rowData) {
          await updateMismatchedRow(
            tableName,
            diff.id!,
            diff.rowData.sqlite as Record<string, unknown>
          )
          repaired++
        }
      } catch (repairError) {
        errors.push(`Failed to repair row ${diff.id}: ${(repairError as Error).message}`)
        logger.error(
          `Failed to repair row ${diff.id} in ${tableName}: ${(repairError as Error).message}`
        )
      }
    }

    logger.info(`Repaired ${repaired} rows in ${tableName}, skipped ${skipped} rows`)
  } catch (error) {
    errors.push(`Repair failed: ${(error as Error).message}`)
    logger.error(`Repair failed for ${tableName}: ${(error as Error).message}`)
  }

  return {
    success: errors.length === 0,
    repaired,
    skipped,
    errors,
    tableName,
  }
}

async function insertMissingRow(
  tableName: string,
  rowData: Record<string, unknown>
): Promise<void> {
  const columns = Object.keys(rowData).filter((k) => k !== 'id')
  const values = columns.map((k) => rowData[k])
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ')

  const insertSql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`

  await postgresClient!.prepare(insertSql).run(...values)
  logger.debug(`Inserted missing row into ${tableName}`)
}

async function updateMismatchedRow(
  tableName: string,
  id: string,
  rowData: Record<string, unknown>
): Promise<void> {
  const updates = Object.keys(rowData)
    .filter((k) => k !== 'id')
    .map((k, i) => `${k} = $${i + 1}`)
    .join(', ')

  const values = Object.keys(rowData)
    .filter((k) => k !== 'id')
    .map((k) => rowData[k])

  const updateSql = `UPDATE ${tableName} SET ${updates} WHERE id = $${values.length + 1}`

  await postgresClient!.prepare(updateSql).run(...values, id)
  logger.debug(`Updated mismatched row ${id} in ${tableName}`)
}

export async function autoRepairInconsistencies(tables?: string[]): Promise<{
  results: Record<string, RepairResult>
  allSuccess: boolean
  summary: string
}> {
  if (!isDualWriteEnabled) {
    return { results: {}, allSuccess: false, summary: 'Dual write not enabled' }
  }

  const targetTables = tables || [
    'users',
    'orders',
    'order_items',
    'products',
    'product_skus',
    'coupons',
    'user_coupons',
    'wallet_transactions',
    'flash_sales',
    'flash_sale_items',
    'flash_sale_orders',
  ]

  const results: Record<string, RepairResult> = {}
  let allSuccess = true
  let totalRepaired = 0
  let totalErrors = 0

  for (const table of targetTables) {
    const result = await repairTable(table)
    results[table] = result

    if (!result.success) {
      allSuccess = false
    }
    totalRepaired += result.repaired
    totalErrors += result.errors.length
  }

  const summary = allSuccess
    ? `Auto-repair completed successfully: ${totalRepaired} rows repaired`
    : `Auto-repair completed with errors: ${totalRepaired} rows repaired, ${totalErrors} errors`

  if (allSuccess) {
    logger.info(summary)
  } else {
    logger.error(summary)
    triggerAlert('repair_failed', summary, { results, totalRepaired, totalErrors })
  }

  return { results, allSuccess, summary }
}

export async function getDualWriteStatus(): Promise<{
  enabled: boolean
  postgresConnected: boolean
  lastCheck?: Date
  checkInterval: number
}> {
  return {
    enabled: isDualWriteEnabled,
    postgresConnected: postgresClient !== null,
    checkInterval: parseInt(process.env.DUAL_WRITE_CHECK_INTERVAL || '300000', 10),
  }
}

export default {
  enableDualWrite,
  disableDualWrite,
  isDualWriteActive,
  dualWrite,
  dualExec,
  verifyDualWriteConsistency,
  verifyAllTablesConsistency,
  repairTable,
  autoRepairInconsistencies,
  getDualWriteStatus,
  getConsistencyHistory,
  onAlert,
}
