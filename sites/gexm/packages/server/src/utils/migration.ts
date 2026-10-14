import Database from 'better-sqlite3'
import { Pool } from 'pg'
import config from '../config'
import logger from './logger'
import { postgresSchema, postgresDefaultData } from '../models/postgresSchema'

interface MigrationResult {
  success: boolean
  tablesMigrated: string[]
  rowsMigrated: Record<string, number>
  totalRecords: number
  duration: number
  errors: string[]
}

const tableOrder = [
  'users',
  'refresh_tokens',
  'oauth_accounts',
  'oauth_states',
  'notifications',
  'files',
  'sync_records',
  'error_logs',
  'conversations',
  'messages',
  'comments',
  'conversation_reads',
  'sensitive_data',
  'categories',
  'products',
  'product_skus',
  'carts',
  'addresses',
  'orders',
  'logistics',
  'order_items',
  'payments',
  'reviews',
  'favorites',
  'stock_logs',
  'search_history',
  'coupons',
  'user_coupons',
  'member_levels',
  'user_points',
  'point_logs',
  'shipping_templates',
  'flash_sales',
  'flash_sale_items',
  'flash_sale_orders',
  'checkins',
  'inbox_messages',
  'audit_logs',
  'roles',
  'permissions',
  'role_permissions',
  'user_roles',
  'sensitive_verify_tokens',
  'reconciliation_records',
  'login_attempts',
  'verify_codes',
]

const BATCH_SIZE = 500

export async function migrateFromSqliteToPostgres(sqlitePath: string): Promise<MigrationResult> {
  const startTime = Date.now()
  const result: MigrationResult = {
    success: true,
    tablesMigrated: [],
    rowsMigrated: {},
    totalRecords: 0,
    duration: 0,
    errors: [],
  }

  let sqliteDb: Database.Database | null = null
  let pgPool: Pool | null = null

  try {
    logger.info('========================================')
    logger.info('Starting SQLite to PostgreSQL Migration')
    logger.info('========================================')

    sqliteDb = new Database(sqlitePath)
    logger.info(`✓ Connected to SQLite database: ${sqlitePath}`)

    const { database, host, port, username } = config.database
    pgPool = new Pool({
      host,
      port,
      database,
      user: username,
      password: config.database.password,
      max: 20,
    })
    logger.info(`✓ Connected to PostgreSQL database: ${host}:${port}/${database}`)

    const pgClient = await pgPool.connect()
    try {
      logger.info('\n--- Creating PostgreSQL schema ---')
      await pgClient.query(postgresSchema)
      logger.info('✓ PostgreSQL schema created successfully')

      logger.info('\n--- Migrating tables ---')
      logger.info(`Total tables to migrate: ${tableOrder.length}`)

      for (const tableName of tableOrder) {
        try {
          const rowCount = await migrateTable(
            sqliteDb,
            pgClient as unknown as {
              query: (sql: string, params?: unknown[]) => Promise<unknown>
              release: () => void
            },
            tableName
          )
          result.tablesMigrated.push(tableName)
          result.rowsMigrated[tableName] = rowCount
          result.totalRecords += rowCount
        } catch (err) {
          result.success = false
          const errorMsg = `Failed to migrate ${tableName}: ${(err as Error).message}`
          result.errors.push(errorMsg)
          logger.error(errorMsg)
        }
      }

      logger.info('\n--- Inserting default data ---')
      await pgClient.query(postgresDefaultData)
      logger.info('✓ Default data inserted')

      logger.info('\n--- Verifying migration ---')
      await _verifyMigration(
        sqliteDb,
        pgClient as unknown as {
          query: (
            sql: string,
            params?: unknown[]
          ) => Promise<{ rows: Array<{ count: number | string }> }>
        },
        result
      )
    } finally {
      pgClient.release()
    }
  } catch (err) {
    result.success = false
    result.errors.push(`Migration failed: ${(err as Error).message}`)
    logger.error(`Migration failed: ${(err as Error).message}`)
  } finally {
    if (sqliteDb) {
      sqliteDb.close()
      logger.info('✓ SQLite database closed')
    }
    if (pgPool) {
      await pgPool.end()
      logger.info('✓ PostgreSQL connection pool closed')
    }
  }

  result.duration = Date.now() - startTime

  logger.info('\n========================================')
  logger.info('Migration Summary')
  logger.info('========================================')
  logger.info(`Success: ${result.success ? 'Yes' : 'No'}`)
  logger.info(`Tables migrated: ${result.tablesMigrated.length}/${tableOrder.length}`)
  logger.info(`Total records migrated: ${result.totalRecords}`)
  logger.info(`Duration: ${result.duration}ms`)

  if (result.errors.length > 0) {
    logger.info(`Errors: ${result.errors.length}`)
  }

  return result
}

async function migrateTable(
  sqliteDb: Database.Database,
  pgClient: { query: (sql: string, params?: unknown[]) => Promise<unknown>; release: () => void },
  tableName: string
): Promise<number> {
  const startTime = Date.now()
  const sqliteRows = sqliteDb.prepare(`SELECT * FROM ${tableName}`).all()

  if (sqliteRows.length === 0) {
    logger.info(`[SKIP] ${tableName}: No data to migrate`)
    return 0
  }

  const columns = Object.keys(sqliteRows[0])
  const columnList = columns.join(', ')

  await pgClient.query('BEGIN')

  try {
    let inserted = 0
    const totalRows = sqliteRows.length

    for (let i = 0; i < totalRows; i += BATCH_SIZE) {
      const batch = sqliteRows.slice(i, Math.min(i + BATCH_SIZE, totalRows))

      const valueGroups: string[] = []
      const values: unknown[] = []

      let paramIndex = 1
      for (const row of batch) {
        const rowValues = columns.map((col) => {
          const value = row[col]
          if (value === null || value === undefined) {
            return null
          }
          return value
        })
        const placeholders = rowValues.map(() => '$' + paramIndex++).join(', ')
        valueGroups.push('(' + placeholders + ')')
        values.push(...rowValues)
      }

      const insertSql =
        'INSERT INTO ' +
        tableName +
        ' (' +
        columnList +
        ') VALUES ' +
        valueGroups.join(', ') +
        ' ON CONFLICT DO NOTHING'
      const result = await pgClient.query(insertSql, values)
      inserted += (result as { rowCount?: number }).rowCount || batch.length
    }

    await pgClient.query('COMMIT')
    const duration = Date.now() - startTime
    logger.info(
      '[OK] ' +
        tableName +
        ': ' +
        inserted +
        ' rows migrated in ' +
        duration +
        'ms (' +
        Math.ceil(totalRows / BATCH_SIZE) +
        ' batches)'
    )
    return inserted
  } catch (err) {
    await pgClient.query('ROLLBACK')
    logger.error('[FAIL] ' + tableName + ': Migration failed - ' + (err as Error).message)
    throw err
  }
}

async function _verifyMigration(
  sqliteDb: Database.Database,
  pgClient: {
    query: (sql: string, params?: unknown[]) => Promise<{ rows: Array<{ count: number | string }> }>
  },
  result: MigrationResult
): Promise<void> {
  logger.info('Verifying migration...')

  for (const tableName of result.tablesMigrated) {
    const sqliteCount = sqliteDb.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get().count
    const pgResult = await pgClient.query(`SELECT COUNT(*) as count FROM ${tableName}`)
    const pgCount = parseInt(pgResult.rows[0].count.toString(), 10)

    if (sqliteCount !== pgCount) {
      logger.warn(
        `Row count mismatch for ${tableName}: SQLite=${sqliteCount}, PostgreSQL=${pgCount}`
      )
      result.errors.push(
        `Row count mismatch for ${tableName}: SQLite=${sqliteCount}, PostgreSQL=${pgCount}`
      )
      result.success = false
    }
  }

  logger.info('Migration verification completed')
}

export async function verifyMigration(sqlitePath: string): Promise<void> {
  const sqliteDb = new Database(sqlitePath)
  const { database, host, port, username, password } = config.database

  const pool = new Pool({
    host,
    port,
    database,
    user: username,
    password,
  })

  try {
    const pgClient = await pool.connect()
    const result: MigrationResult = {
      success: true,
      tablesMigrated: [],
      rowsMigrated: {},
      totalRecords: 0,
      duration: 0,
      errors: [],
    }

    const tables = sqliteDb
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
      )
      .all()

    tables.forEach((table: { name: string }) => {
      result.tablesMigrated.push(table.name)
    })

    await _verifyMigration(sqliteDb, pgClient, result)

    if (!result.success) {
      throw new Error('Migration verification failed')
    }

    pgClient.release()
  } finally {
    sqliteDb.close()
    await pool.end()
  }
}

export async function runMigration(): Promise<void> {
  if (config.database.type !== 'postgres') {
    logger.warn('Database type is not PostgreSQL, skipping migration')
    return
  }

  const sqlitePath = config.database.path
  const result = await migrateFromSqliteToPostgres(sqlitePath)

  if (result.success) {
    logger.info('Migration completed successfully:')
    logger.info(`  Tables migrated: ${result.tablesMigrated.length}`)
    logger.info(
      `  Total rows migrated: ${Object.values(result.rowsMigrated).reduce((a, b) => a + b, 0)}`
    )
  } else {
    logger.error('Migration failed with errors:')
    result.errors.forEach((err) => logger.error(`  - ${err}`))
    throw new Error('Migration failed')
  }
}

export async function testPostgresConnection(): Promise<boolean> {
  const { database, host, port, username, password } = config.database

  const pool = new Pool({
    host,
    port,
    database,
    user: username,
    password,
  })

  try {
    const client = await pool.connect()
    await client.query('SELECT 1')
    client.release()
    logger.info('PostgreSQL connection test successful')
    return true
  } catch (err) {
    logger.error(`PostgreSQL connection test failed: ${(err as Error).message}`)
    return false
  } finally {
    await pool.end()
  }
}

export async function compareSchemas(): Promise<void> {
  const sqlitePath = config.database.path
  const sqliteDb = new Database(sqlitePath)

  try {
    const sqliteTables = sqliteDb
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
      )
      .all()

    logger.info('=== SQLite Tables ===')
    sqliteTables.forEach((table: { name: string }) => {
      const columns = sqliteDb.pragma(`table_info(${table.name})`)
      logger.info(`  ${table.name}: ${columns.length} columns`)
    })

    if (config.database.type === 'postgres') {
      const { database, host, port, username, password } = config.database
      const pool = new Pool({
        host,
        port,
        database,
        user: username,
        password,
      })

      try {
        const pgClient = await pool.connect()
        const pgResult = await pgClient.query(
          "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
        )

        logger.info('=== PostgreSQL Tables ===')
        for (const row of pgResult.rows) {
          const tableName = row.table_name
          const colResult = await pgClient.query(
            'SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position',
            [tableName]
          )
          logger.info(`  ${tableName}: ${colResult.rows.length} columns`)
        }

        const sqliteTableNames = new Set<string>(sqliteTables.map((t: { name: string }) => t.name))
        const pgTableNames = new Set<string>(
          (pgResult.rows as Array<{ table_name: string }>).map((r) => r.table_name)
        )

        const onlyInSqlite: string[] = [...sqliteTableNames].filter((t) => !pgTableNames.has(t))
        const onlyInPg: string[] = [...pgTableNames].filter((t) => !sqliteTableNames.has(t))

        if (onlyInSqlite.length > 0) {
          logger.warn(`Tables only in SQLite: ${onlyInSqlite.join(', ')}`)
        }
        if (onlyInPg.length > 0) {
          logger.warn(`Tables only in PostgreSQL: ${onlyInPg.join(', ')}`)
        }

        if (onlyInSqlite.length === 0 && onlyInPg.length === 0) {
          logger.info('All tables exist in both databases')
        }

        pgClient.release()
      } finally {
        await pool.end()
      }
    } else {
      logger.warn('Database type is not PostgreSQL, skipping PostgreSQL schema comparison')
    }
  } finally {
    sqliteDb.close()
  }
}
