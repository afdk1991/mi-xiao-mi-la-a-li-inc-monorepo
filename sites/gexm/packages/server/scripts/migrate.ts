import sqlite3 from 'sqlite3'
import { Client } from 'pg'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.join(__dirname, '../../.env') })

interface MigrationResult {
  table: string
  totalRows: number
  migratedRows: number
  skippedRows: number
  errors: string[]
}

const tables = [
  'users',
  'categories',
  'products',
  'product_skus',
  'addresses',
  'refresh_tokens',
  'oauth_accounts',
  'oauth_states',
  'conversations',
  'messages',
  'conversation_reads',
  'comments',
  'notifications',
  'files',
  'sensitive_data',
  'carts',
  'orders',
  'order_items',
  'logistics',
  'payments',
  'reviews',
  'favorites',
  'stock_logs',
  'search_history',
  'sync_records',
  'error_logs',
]

function parseTimestamp(value: string | null): string | null {
  if (!value) return null
  if (value.includes('T')) return value
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) {
    return value.replace(' ', 'T') + '.000Z'
  }
  return value
}

function convertValue(value: any): any {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return value
  if (typeof value === 'boolean') return value ? 1 : 0
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed === '') return null
    return trimmed
  }
  return value
}

async function migrateTable(
  sqliteDb: sqlite3.Database,
  pgClient: Client,
  tableName: string
): Promise<MigrationResult> {
  const result: MigrationResult = {
    table: tableName,
    totalRows: 0,
    migratedRows: 0,
    skippedRows: 0,
    errors: [],
  }

  return new Promise((resolve) => {
    sqliteDb.all(`SELECT * FROM ${tableName}`, async (err, rows: any[]) => {
      if (err) {
        result.errors.push(`Query failed: ${err.message}`)
        resolve(result)
        return
      }

      result.totalRows = rows.length

      if (rows.length === 0) {
        resolve(result)
        return
      }

      const columns = Object.keys(rows[0])
      const placeholders = columns.map(() => '$' + (columns.indexOf(columns[0]) + 1))

      for (let i = 0; i < rows.length; i++) {
        try {
          const row = rows[i]
          const values = columns.map((col) => {
            if (col.endsWith('_at')) {
              return parseTimestamp(row[col])
            }
            return convertValue(row[col])
          })

          const columnNames = columns.join(', ')
          const placeholderStr = columns.map((_, idx) => `$${idx + 1}`).join(', ')
          const query = `INSERT INTO ${tableName} (${columnNames}) VALUES (${placeholderStr}) ON CONFLICT DO NOTHING`

          await pgClient.query(query, values)
          result.migratedRows++
        } catch (e: any) {
          result.errors.push(`Row ${i} failed: ${e.message}`)
          result.skippedRows++
        }
      }

      resolve(result)
    })
  })
}

async function main() {
  const sqlitePath = process.env.DATABASE_PATH || './data/example_db.db'
  const pgConfig = {
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5432'),
    database: process.env.PG_DATABASE || 'gexm',
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || '',
  }

  console.log('Starting SQLite to PostgreSQL migration...')
  console.log(`SQLite path: ${sqlitePath}`)
  console.log(`PostgreSQL: ${pgConfig.user}@${pgConfig.host}:${pgConfig.port}/${pgConfig.database}`)

  const sqliteDb = new sqlite3.Database(sqlitePath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
      console.error('Failed to open SQLite database:', err.message)
      process.exit(1)
    }
  })

  const pgClient = new Client(pgConfig)
  try {
    await pgClient.connect()
    console.log('Connected to PostgreSQL successfully')
  } catch (err: any) {
    console.error('Failed to connect to PostgreSQL:', err.message)
    process.exit(1)
  }

  const results: MigrationResult[] = []

  for (const table of tables) {
    console.log(`Migrating table: ${table}...`)
    const result = await migrateTable(sqliteDb, pgClient, table)
    results.push(result)
    console.log(`  Total: ${result.totalRows}, Migrated: ${result.migratedRows}, Skipped: ${result.skippedRows}`)
    if (result.errors.length > 0) {
      console.log(`  Errors: ${result.errors.length}`)
    }
  }

  console.log('\nMigration Summary:')
  console.log('==================')
  const totalRows = results.reduce((sum, r) => sum + r.totalRows, 0)
  const totalMigrated = results.reduce((sum, r) => sum + r.migratedRows, 0)
  const totalSkipped = results.reduce((sum, r) => sum + r.skippedRows, 0)
  const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0)

  console.log(`Total tables: ${results.length}`)
  console.log(`Total rows: ${totalRows}`)
  console.log(`Successfully migrated: ${totalMigrated}`)
  console.log(`Skipped: ${totalSkipped}`)
  console.log(`Errors: ${totalErrors}`)

  if (totalErrors > 0) {
    console.log('\nTables with errors:')
    results.filter((r) => r.errors.length > 0).forEach((r) => {
      console.log(`  ${r.table}: ${r.errors.length} errors`)
    })
  }

  sqliteDb.close()
  await pgClient.end()

  console.log('\nMigration completed!')
}

main().catch((err) => {
  console.error('Migration failed:', err.message)
  process.exit(1)
})