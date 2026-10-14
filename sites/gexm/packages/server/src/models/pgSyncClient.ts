import { Pool, QueryResult, QueryResultRow } from 'pg'
import deasync from 'deasync'
import config from '../config'
import logger from '../utils/logger'
import { translateSql } from './sqlDialect'

interface SyncPreparedStatement {
  run: (...params: unknown[]) => { changes: number; lastInsertRowid: number }
  get: (...params: unknown[]) => any
  all: (...params: unknown[]) => any[]
}

export interface ISyncDbClient {
  prepare: (sql: string) => SyncPreparedStatement
  exec: (sql: string) => void
  transaction: <T>(fn: () => T) => () => T
  pragma: (sql: string) => unknown[]
  close: () => void
  healthCheck: () => boolean
  getConnectionInfo: () => Record<string, unknown>
}

interface PgSyncClientOptions {
  host?: string
  port?: number
  database?: string
  user?: string
  password?: string
  max?: number
}

export class PgSyncClient implements ISyncDbClient {
  private pool: Pool
  private transactionDepth: number = 0
  private options: PgSyncClientOptions

  constructor(options: PgSyncClientOptions = {}) {
    const {
      database,
      host,
      port,
      username,
      password,
      poolMax,
      poolIdleTimeout,
      poolConnectionTimeout,
    } = config.database

    this.options = {
      host: options.host || host,
      port: options.port || port,
      database: options.database || database,
      user: options.user || username,
      password: options.password || password,
      max: options.max || poolMax,
    }

    this.pool = new Pool({
      host: this.options.host,
      port: this.options.port,
      database: this.options.database,
      user: this.options.user,
      password: this.options.password,
      max: this.options.max,
      idleTimeoutMillis: poolIdleTimeout,
      connectionTimeoutMillis: poolConnectionTimeout,
    })
    logger.info(
      `PgSyncClient initialized (host=${this.options.host}, port=${this.options.port}, db=${this.options.database}, poolMax=${this.options.max})`
    )
  }

  private syncAwait<T>(promise: Promise<T>): T {
    let result: T | undefined
    let error: Error | undefined
    let done = false

    promise
      .then((r) => {
        result = r
        done = true
      })
      .catch((e) => {
        error = e instanceof Error ? e : new Error(String(e))
        done = true
      })

    deasync.loopWhile(() => !done)

    if (error) {
      throw error
    }
    return result as T
  }

  prepare(sql: string): SyncPreparedStatement {
    const translatedSql = translateSql(sql)
    return {
      run: (...params: unknown[]) => {
        const result = this.syncAwait(this.pool.query(translatedSql, params as unknown[]))
        const changes = result.rowCount || 0
        const rawId = (result.rows[0] as QueryResultRow)?.id
        const lastInsertRowid = typeof rawId === 'number' ? rawId : 0
        return { changes, lastInsertRowid }
      },
      get: (...params: unknown[]) => {
        const result = this.syncAwait(this.pool.query(translatedSql, params as unknown[]))
        return result.rows[0] || undefined
      },
      all: (...params: unknown[]) => {
        const result = this.syncAwait(this.pool.query(translatedSql, params as unknown[]))
        return result.rows
      },
    }
  }

  exec(sql: string): void {
    // Split multi-statement SQL into individual statements
    // PostgreSQL pg library can fail on very large multi-statement queries
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'))
    for (const stmt of statements) {
      this.syncAwait(this.pool.query(stmt))
    }
  }

  transaction<T>(fn: () => T): () => T {
    return () => {
      const client = this.syncAwait(this.pool.connect())
      try {
        this.syncAwait(client.query('BEGIN'))
        try {
          const result = fn()
          this.syncAwait(client.query('COMMIT'))
          return result
        } catch (err) {
          this.syncAwait(client.query('ROLLBACK'))
          throw err
        }
      } finally {
        client.release()
      }
    }
  }

  pragma(_sql: string): unknown[] {
    logger.warn('PostgreSQL does not support PRAGMA commands — use sqlDialect adapter instead')
    return []
  }

  close(): void {
    this.syncAwait(this.pool.end())
  }

  healthCheck(): boolean {
    try {
      this.syncAwait(this.pool.query('SELECT 1'))
      return true
    } catch {
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
}
