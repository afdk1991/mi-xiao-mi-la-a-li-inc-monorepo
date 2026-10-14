import Database from 'better-sqlite3'
import { Pool, PoolClient } from 'pg'
import config from '../config'
import logger from '../utils/logger'

interface DbRow {
  [key: string]: unknown
}

interface PreparedStatement {
  run: (...params: unknown[]) => Promise<{ changes: number; lastInsertRowid: number }>
  get: <T extends DbRow = DbRow>(...params: unknown[]) => Promise<T | undefined>
  all: <T extends DbRow = DbRow>(...params: unknown[]) => Promise<T[]>
}

interface Transaction {
  (): Promise<void>
}

export interface IDbClient {
  prepare: (_sql: string) => PreparedStatement
  exec: (_sql: string) => void
  transaction: (fn: () => void) => Transaction
  pragma: (_sql: string) => unknown[]
  close: () => void
  healthCheck: () => Promise<boolean>
  getConnectionInfo: () => Record<string, unknown>
}

class SQLiteClient implements IDbClient {
  private db: Database.Database

  constructor(path: string) {
    this.db = new Database(path)
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('foreign_keys = ON')
    this.db.pragma('synchronous = NORMAL')
    this.db.pragma('cache_size = -64000')
    this.db.pragma('temp_store = MEMORY')
    this.db.pragma('mmap_size = 268435456')
    this.db.pragma('encoding = "UTF-8"')
    logger.info('SQLite database initialized')
  }

  prepare(sql: string): PreparedStatement {
    const stmt = this.db.prepare(sql)
    return {
      run: (...params) => Promise.resolve(stmt.run(...params)),
      get: (...params) => Promise.resolve(stmt.get(...params)),
      all: (...params) => Promise.resolve(stmt.all(...params)),
    }
  }

  exec(sql: string): void {
    this.db.exec(sql)
  }

  transaction(fn: () => void): Transaction {
    const tx = () =>
      new Promise<void>((resolve, reject) => {
        try {
          this.db.transaction(fn)()
          resolve()
        } catch (err) {
          reject(err)
        }
      })
    return tx
  }

  pragma(sql: string): unknown[] {
    return this.db.pragma(sql)
  }

  close(): void {
    this.db.close()
  }

  async healthCheck(): Promise<boolean> {
    try {
      this.db.prepare('SELECT 1').get()
      return true
    } catch {
      return false
    }
  }

  getConnectionInfo(): Record<string, unknown> {
    return {
      type: 'sqlite',
      path: config.database.path,
      journalMode: this.db.pragma('journal_mode')[0],
    }
  }
}

class PostgresClient implements IDbClient {
  private pool: Pool

  constructor() {
    const { database, host, port, username, password, poolMax, poolIdleTimeout, poolConnectionTimeout } = config.database
    this.pool = new Pool({
      host,
      port,
      database,
      user: username,
      password,
      max: poolMax,
      idleTimeoutMillis: poolIdleTimeout,
      connectionTimeoutMillis: poolConnectionTimeout,
    })
    logger.info(`PostgreSQL connection pool initialized (max=${poolMax}, idleTimeout=${poolIdleTimeout}ms)`)
  }

  async getClient(): Promise<PoolClient> {
    return this.pool.connect()
  }

  prepare(sql: string): PreparedStatement {
    return {
      run: async (...params) => {
        const client = await this.getClient()
        try {
          const result = await client.query(sql, params as unknown[])
          return {
            changes: result.rowCount || 0,
            lastInsertRowid: (result.rows[0] as unknown as { id: number })?.id || 0,
          }
        } finally {
          client.release()
        }
      },
      get: async <T extends DbRow = DbRow>(...params) => {
        const client = await this.getClient()
        try {
          const result = await client.query(sql, params as unknown[])
          return result.rows[0] as unknown as T | undefined
        } finally {
          client.release()
        }
      },
      all: async <T extends DbRow = DbRow>(...params) => {
        const client = await this.getClient()
        try {
          const result = await client.query(sql, params as unknown[])
          return result.rows as unknown as T[]
        } finally {
          client.release()
        }
      },
    }
  }

  exec(sql: string): void {
    this.pool.query(sql).catch((err) => {
      logger.error('PostgreSQL exec error:', err)
    })
  }

  transaction(fn: () => void): Transaction {
    return async () => {
      const client = await this.getClient()
      try {
        await client.query('BEGIN')
        try {
          await fn()
          await client.query('COMMIT')
        } catch (err) {
          await client.query('ROLLBACK')
          throw err
        }
      } finally {
        client.release()
      }
    }
  }

  pragma(_sql: string): unknown[] {
    logger.warn('PostgreSQL does not support PRAGMA commands')
    return []
  }

  async healthCheck(): Promise<boolean> {
    try {
      const client = await this.getClient()
      try {
        await client.query('SELECT 1')
        return true
      } finally {
        client.release()
      }
    } catch (err) {
      logger.error('PostgreSQL health check failed:', (err as Error).message)
      return false
    }
  }

  getConnectionInfo(): Record<string, unknown> {
    return {
      type: 'postgres',
      host: config.database.host,
      port: config.database.port,
      database: config.database.database,
      poolTotalCount: this.pool.totalCount,
      poolIdleCount: this.pool.idleCount,
      poolWaitingCount: this.pool.waitingCount,
    }
  }

  close(): void {
    this.pool.end()
  }
}

let dbClient: IDbClient | null = null

export function getDbClient(): IDbClient {
  if (!dbClient) {
    const { type, path } = config.database
    if (type === 'postgres') {
      dbClient = new PostgresClient()
    } else {
      dbClient = new SQLiteClient(path)
    }
  }
  return dbClient
}

export function initDbClient(): IDbClient {
  dbClient = getDbClient()
  return dbClient
}

export function closeDbClient(): void {
  if (dbClient) {
    dbClient.close()
    dbClient = null
  }
}

export { SQLiteClient, PostgresClient }
