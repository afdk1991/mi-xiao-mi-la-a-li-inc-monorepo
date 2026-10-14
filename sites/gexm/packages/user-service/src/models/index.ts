import Database from 'better-sqlite3'
import config from '../config'
import logger from '../utils/logger'

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(config.database.path)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    logger.info('SQLite database connected')
  }
  return db
}

export function initDatabase(): void {
  const database = getDb()

  database.prepare(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT NOT NULL,
      email_hash TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      nickname TEXT,
      avatar TEXT DEFAULT '',
      phone TEXT,
      status TEXT DEFAULT 'active',
      role TEXT DEFAULT 'user',
      balance REAL DEFAULT 0,
      level_id TEXT,
      points INTEGER DEFAULT 0,
      email_verified INTEGER DEFAULT 0,
      phone_verified INTEGER DEFAULT 0,
      is_new_user INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_login_at TEXT
    )
  `).run()

  database.prepare('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)').run()
  database.prepare('CREATE INDEX IF NOT EXISTS idx_users_email_hash ON users(email_hash)').run()
  database.prepare('CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)').run()

  database.prepare(`
    CREATE TABLE IF NOT EXISTS addresses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      province TEXT NOT NULL,
      city TEXT NOT NULL,
      district TEXT NOT NULL,
      detail TEXT NOT NULL,
      is_default INTEGER DEFAULT 0,
      tag TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `).run()

  database.prepare('CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id)').run()

  database.prepare(`
    CREATE TABLE IF NOT EXISTS oauth_accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      provider_user_id TEXT NOT NULL,
      provider_username TEXT,
      provider_email TEXT,
      avatar TEXT,
      access_token TEXT,
      refresh_token TEXT,
      expires_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `).run()

  database.prepare('CREATE INDEX IF NOT EXISTS idx_oauth_provider_user ON oauth_accounts(provider, provider_user_id)').run()
  database.prepare('CREATE INDEX IF NOT EXISTS idx_oauth_user_id ON oauth_accounts(user_id)').run()

  database.prepare(`
    CREATE TABLE IF NOT EXISTS oauth_states (
      id TEXT PRIMARY KEY,
      state TEXT UNIQUE NOT NULL,
      redirect_uri TEXT,
      expires_at INTEGER NOT NULL,
      created_at TEXT NOT NULL
    )
  `).run()

  database.prepare('CREATE INDEX IF NOT EXISTS idx_oauth_states_state ON oauth_states(state)').run()

  database.prepare(`
    CREATE TABLE IF NOT EXISTS login_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      attempts INTEGER DEFAULT 0,
      locked_until TEXT,
      last_attempt TEXT NOT NULL
    )
  `).run()

  database.prepare('CREATE INDEX IF NOT EXISTS idx_login_attempts_username ON login_attempts(username)').run()

  database.prepare(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `).run()

  database.prepare('CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token)').run()
  database.prepare('CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id)').run()

  logger.info('User service database initialized')
}

export function closeDb(): void {
  if (db) {
    db.close()
    db = null
    logger.info('SQLite database closed')
  }
}
