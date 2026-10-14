import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import config from '../config'
import logger from '../utils/logger'
import { generateId } from '../utils/response'
import bcrypt from 'bcryptjs'
import { PgSyncClient } from './pgSyncClient'
import { isPostgres, translateSql, getTableColumns, getForeignKeyList } from './sqlDialect'
import { postgresSchema } from './postgresSchema'

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

class SQLiteSyncClient implements ISyncDbClient {
  private db: Database.Database

  constructor(dbPath: string) {
    const dbDir = path.dirname(config.database.path)
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true })
    }
    this.db = new Database(dbPath)
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('foreign_keys = ON')
    this.db.pragma('synchronous = NORMAL')
    this.db.pragma('cache_size = -64000')
    this.db.pragma('temp_store = MEMORY')
    this.db.pragma('mmap_size = 268435456')
    this.db.pragma('encoding = "UTF-8"')
    logger.info('SQLite database initialized')
  }

  prepare(sql: string): SyncPreparedStatement {
    const stmt = this.db.prepare(sql)
    return {
      run: (...params) => stmt.run(...params),
      get: (...params) => stmt.get(...params),
      all: (...params) => stmt.all(...params),
    }
  }

  exec(sql: string): void {
    this.db.exec(sql)
  }

  transaction<T>(fn: () => T): () => T {
    const tx = this.db.transaction(fn)
    return () => tx()
  }

  pragma(sql: string): unknown[] {
    return this.db.pragma(sql)
  }

  close(): void {
    this.db.close()
  }

  healthCheck(): boolean {
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

let syncDbClient: ISyncDbClient | null = null

function initDatabase(): ISyncDbClient {
  if (syncDbClient) {
    return syncDbClient
  }

  const { type, path: dbPath } = config.database

  if (type === 'postgres') {
    try {
      syncDbClient = new PgSyncClient()
      logger.info('PostgreSQL database initialized via PgSyncClient')
    } catch (err) {
      logger.error(
        'Failed to initialize PostgreSQL, falling back to SQLite:',
        (err as Error).message
      )
      syncDbClient = new SQLiteSyncClient(dbPath)
    }
  } else {
    syncDbClient = new SQLiteSyncClient(dbPath)
  }

  createTables()
  initDefaultData()

  logger.info('Database initialized successfully')
  return syncDbClient
}

function createTables() {
  if (!syncDbClient) {
    return
  }

  if (isPostgres()) {
    syncDbClient.exec(postgresSchema)
    logger.info('PostgreSQL schema created via postgresSchema')
    return
  }

  try {
    syncDbClient.prepare('ALTER TABLE users ADD COLUMN email_hash TEXT').run()
  } catch {}
  try {
    syncDbClient.prepare('CREATE UNIQUE INDEX idx_users_email_hash ON users(email_hash)').run()
  } catch {}

  syncDbClient.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      email_hash TEXT,
      password TEXT,
      nickname TEXT,
      avatar TEXT,
      phone TEXT,
      status TEXT DEFAULT 'active',
      role TEXT DEFAULT 'user',
      balance REAL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_login_at TEXT
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

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
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(provider, provider_user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_oauth_provider ON oauth_accounts(provider);
    CREATE INDEX IF NOT EXISTS idx_oauth_user_id ON oauth_accounts(user_id);
    CREATE INDEX IF NOT EXISTS idx_oauth_provider_user ON oauth_accounts(provider, provider_user_id);

    CREATE TABLE IF NOT EXISTS oauth_states (
      id TEXT PRIMARY KEY,
      state TEXT UNIQUE NOT NULL,
      redirect_uri TEXT,
      expires_at INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_oauth_states_state ON oauth_states(state);
    CREATE INDEX IF NOT EXISTS idx_oauth_states_expires ON oauth_states(expires_at);

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      type TEXT DEFAULT 'system',
      read INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      size INTEGER NOT NULL,
      type TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sync_records (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      table_name TEXT NOT NULL,
      record_id TEXT NOT NULL,
      action TEXT NOT NULL,
      sync_status TEXT DEFAULT 'pending',
      timestamp INTEGER NOT NULL,
      retry_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS error_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      platform TEXT,
      app_version TEXT,
      error_type TEXT,
      error_message TEXT,
      stack_trace TEXT,
      user_agent TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      creator_id TEXT NOT NULL,
      participant_id TEXT,
      type TEXT DEFAULT 'private',
      title TEXT,
      status TEXT DEFAULT 'active',
      last_message TEXT,
      last_message_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      content TEXT NOT NULL,
      type TEXT DEFAULT 'text',
      status TEXT DEFAULT 'sent',
      created_at TEXT NOT NULL,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      target_type TEXT DEFAULT 'global',
      target_id TEXT,
      content TEXT NOT NULL,
      parent_id TEXT,
      status TEXT DEFAULT 'active',
      likes INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS conversation_reads (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      conversation_id TEXT NOT NULL,
      last_read_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
      UNIQUE(user_id, conversation_id)
    );

    CREATE TABLE IF NOT EXISTS sensitive_data (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      data_type TEXT NOT NULL,
      encrypted_value TEXT NOT NULL,
      hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, data_type)
    );

    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
    CREATE INDEX IF NOT EXISTS idx_sync_records_user_id ON sync_records(user_id);
    CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_conversations_creator ON conversations(creator_id);
    CREATE INDEX IF NOT EXISTS idx_conversations_participant ON conversations(participant_id);
    CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
    CREATE INDEX IF NOT EXISTS idx_comments_target ON comments(target_type, target_id);
    CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);
    CREATE INDEX IF NOT EXISTS idx_conversation_reads_user ON conversation_reads(user_id);
    CREATE INDEX IF NOT EXISTS idx_conversation_reads_conversation ON conversation_reads(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_sensitive_data_user ON sensitive_data(user_id);
    CREATE INDEX IF NOT EXISTS idx_sensitive_data_hash ON sensitive_data(hash);

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      parent_id TEXT,
      level INTEGER DEFAULT 1,
      icon TEXT,
      sort_order INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      subtitle TEXT,
      category_id TEXT,
      main_image TEXT,
      images TEXT,
      price REAL NOT NULL DEFAULT 0,
      original_price REAL,
      stock INTEGER DEFAULT 0,
      sales INTEGER DEFAULT 0,
      description TEXT,
      status TEXT DEFAULT 'on_sale',
      sort_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS product_skus (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      sku_name TEXT NOT NULL,
      specs TEXT,
      price REAL NOT NULL DEFAULT 0,
      original_price REAL,
      stock INTEGER DEFAULT 0,
      sku_image TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS carts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      sku_id TEXT,
      quantity INTEGER DEFAULT 1,
      selected INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (sku_id) REFERENCES product_skus(id) ON DELETE SET NULL
    );

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
      tag TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_no TEXT UNIQUE NOT NULL,
      user_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      total_amount REAL NOT NULL DEFAULT 0,
      freight REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      pay_amount REAL NOT NULL DEFAULT 0,
      pay_method TEXT,
      pay_time TEXT,
      shipping_address TEXT,
      shipping_company TEXT,
      shipping_no TEXT,
      shipped_at TEXT,
      completed_at TEXT,
      cancelled_at TEXT,
      cancel_reason TEXT,
      refund_reason TEXT,
      refund_amount REAL DEFAULT 0,
      refund_remark TEXT,
      refunded_at TEXT,
      remark TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS logistics (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      company TEXT,
      tracking_no TEXT,
      status TEXT,
      location TEXT,
      description TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      sku_id TEXT,
      product_name TEXT NOT NULL,
      product_image TEXT,
      sku_name TEXT,
      price REAL NOT NULL DEFAULT 0,
      quantity INTEGER NOT NULL DEFAULT 1,
      total_price REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS order_logs (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      action TEXT NOT NULL,
      operator_id TEXT,
      operator_type TEXT DEFAULT 'system',
      detail TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_order_logs_order ON order_logs(order_id);

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      payment_no TEXT UNIQUE,
      pay_method TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      status TEXT DEFAULT 'pending',
      third_party_no TEXT,
      paid_at TEXT,
      callback_data TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      order_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      sku_id TEXT,
      rating INTEGER NOT NULL DEFAULT 5,
      content TEXT NOT NULL,
      images TEXT,
      seller_reply TEXT,
      reply_time TEXT,
      status TEXT DEFAULT 'active',
      likes INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS favorites (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      UNIQUE(user_id, product_id)
    );

    CREATE TABLE IF NOT EXISTS stock_logs (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      sku_id TEXT,
      change_type TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      before_stock INTEGER NOT NULL DEFAULT 0,
      after_stock INTEGER NOT NULL DEFAULT 0,
      reason TEXT,
      operator_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (sku_id) REFERENCES product_skus(id) ON DELETE SET NULL,
      FOREIGN KEY (operator_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS search_history (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      keyword TEXT NOT NULL,
      search_count INTEGER DEFAULT 1,
      last_searched_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
    CREATE INDEX IF NOT EXISTS idx_categories_status ON categories(status);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
    CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
    CREATE INDEX IF NOT EXISTS idx_products_sort ON products(sort_order);
    CREATE INDEX IF NOT EXISTS idx_product_skus_product ON product_skus(product_id);
    CREATE INDEX IF NOT EXISTS idx_carts_user ON carts(user_id);
    CREATE INDEX IF NOT EXISTS idx_addresses_user ON addresses(user_id);
    CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_no ON orders(order_no);
    CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_logistics_order ON logistics(order_id);
    CREATE INDEX IF NOT EXISTS idx_logistics_created_at ON logistics(created_at);
    CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
    CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
    CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
    CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
    CREATE INDEX IF NOT EXISTS idx_favorites_product ON favorites(product_id);
    CREATE INDEX IF NOT EXISTS idx_stock_logs_product ON stock_logs(product_id);
    CREATE INDEX IF NOT EXISTS idx_stock_logs_sku ON stock_logs(sku_id);
    CREATE INDEX IF NOT EXISTS idx_stock_logs_created_at ON stock_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_search_history_user ON search_history(user_id);
    CREATE INDEX IF NOT EXISTS idx_search_history_keyword ON search_history(keyword);
    CREATE INDEX IF NOT EXISTS idx_search_history_count ON search_history(search_count DESC);

    CREATE INDEX IF NOT EXISTS idx_products_status_category_sort ON products(status, category_id, sort_order);
    CREATE INDEX IF NOT EXISTS idx_orders_user_status_created ON orders(user_id, status, created_at);
    CREATE INDEX IF NOT EXISTS idx_orders_user_status ON orders(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON messages(conversation_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_reviews_product_status_created ON reviews(product_id, status, created_at);
    CREATE INDEX IF NOT EXISTS idx_carts_user_product ON carts(user_id, product_id);

    CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
    CREATE INDEX IF NOT EXISTS idx_orders_status_created_at ON orders(status, created_at);
    CREATE INDEX IF NOT EXISTS idx_orders_pay_method_created_at ON orders(pay_method, created_at);
    CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
    CREATE INDEX IF NOT EXISTS idx_carts_created_at ON carts(created_at);
    CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

    CREATE TABLE IF NOT EXISTS coupons (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT DEFAULT 'fixed',
      value REAL NOT NULL DEFAULT 0,
      min_amount REAL DEFAULT 0,
      total_count INTEGER DEFAULT 0,
      used_count INTEGER DEFAULT 0,
      per_user_limit INTEGER DEFAULT 1,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_coupons (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      coupon_id TEXT NOT NULL,
      status TEXT DEFAULT 'unused',
      used_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS member_levels (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      min_points INTEGER DEFAULT 0,
      discount_rate REAL DEFAULT 1,
      benefits TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_points (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      balance INTEGER DEFAULT 0,
      level_id TEXT,
      total_earned INTEGER DEFAULT 0,
      total_spent INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (level_id) REFERENCES member_levels(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS point_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      amount INTEGER NOT NULL DEFAULT 0,
      balance INTEGER NOT NULL DEFAULT 0,
      reason TEXT,
      order_id TEXT,
      reference_type TEXT,
      reference_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS shipping_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT DEFAULT 'fixed',
      base_fee REAL DEFAULT 0,
      base_weight REAL DEFAULT 0,
      extra_fee REAL DEFAULT 0,
      extra_weight REAL DEFAULT 0,
      free_threshold REAL DEFAULT 0,
      regions TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS flash_sales (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS flash_sale_items (
      id TEXT PRIMARY KEY,
      flash_sale_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      sku_id TEXT,
      flash_price REAL NOT NULL DEFAULT 0,
      original_price REAL DEFAULT 0,
      stock INTEGER DEFAULT 0,
      sold_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at TEXT NOT NULL,
      FOREIGN KEY (flash_sale_id) REFERENCES flash_sales(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (sku_id) REFERENCES product_skus(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS checkins (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      checkin_date TEXT NOT NULL,
      streak_days INTEGER DEFAULT 1,
      points_earned INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, checkin_date)
    );

    CREATE TABLE IF NOT EXISTS inbox_messages (
      id TEXT PRIMARY KEY,
      sender_id TEXT,
      receiver_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      type TEXT DEFAULT 'system',
      status TEXT DEFAULT 'unread',
      reply_to_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (reply_to_id) REFERENCES inbox_messages(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_coupons_status ON coupons(status);
    CREATE INDEX IF NOT EXISTS idx_coupons_time ON coupons(start_time, end_time);
    CREATE INDEX IF NOT EXISTS idx_user_coupons_user ON user_coupons(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_coupons_coupon ON user_coupons(coupon_id);
    CREATE INDEX IF NOT EXISTS idx_user_coupons_status ON user_coupons(status);
    CREATE INDEX IF NOT EXISTS idx_member_levels_sort ON member_levels(sort_order);
    CREATE INDEX IF NOT EXISTS idx_user_points_user ON user_points(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_points_level ON user_points(level_id);
    CREATE INDEX IF NOT EXISTS idx_point_logs_user ON point_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_point_logs_type ON point_logs(type);
    CREATE INDEX IF NOT EXISTS idx_point_logs_created ON point_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_shipping_templates_type ON shipping_templates(type);
    CREATE INDEX IF NOT EXISTS idx_flash_sales_status ON flash_sales(status);
    CREATE INDEX IF NOT EXISTS idx_flash_sales_time ON flash_sales(start_time, end_time);
    CREATE INDEX IF NOT EXISTS idx_flash_sale_items_sale ON flash_sale_items(flash_sale_id);
    CREATE INDEX IF NOT EXISTS idx_flash_sale_items_product ON flash_sale_items(product_id);
    CREATE INDEX IF NOT EXISTS idx_flash_sale_items_status ON flash_sale_items(status);
    CREATE INDEX IF NOT EXISTS idx_checkins_user ON checkins(user_id);
    CREATE INDEX IF NOT EXISTS idx_checkins_date ON checkins(checkin_date);
    CREATE INDEX IF NOT EXISTS idx_inbox_messages_receiver ON inbox_messages(receiver_id);
    CREATE INDEX IF NOT EXISTS idx_inbox_messages_status ON inbox_messages(status);
    CREATE INDEX IF NOT EXISTS idx_inbox_messages_type ON inbox_messages(type);
    CREATE INDEX IF NOT EXISTS idx_inbox_messages_created ON inbox_messages(created_at);

    CREATE INDEX IF NOT EXISTS idx_user_coupons_user_status ON user_coupons(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_flash_sale_items_sale_status ON flash_sale_items(flash_sale_id, status);
    CREATE INDEX IF NOT EXISTS idx_inbox_messages_receiver_status_created ON inbox_messages(receiver_id, status, created_at DESC);
  `)

  try {
    syncDbClient.exec('ALTER TABLE point_logs ADD COLUMN balance INTEGER NOT NULL DEFAULT 0')
  } catch {}

  try {
    syncDbClient.exec('ALTER TABLE point_logs ADD COLUMN order_id TEXT')
  } catch {}

  try {
    syncDbClient.exec('ALTER TABLE point_logs ADD COLUMN reference_type TEXT')
  } catch {}

  try {
    syncDbClient.exec('ALTER TABLE point_logs ADD COLUMN reference_id TEXT')
  } catch {}

  migrateAuditLogsTable()

  syncDbClient.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      is_system INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS permissions (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      code TEXT UNIQUE NOT NULL,
      module TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS role_permissions (
      role_id TEXT NOT NULL,
      permission_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (role_id, permission_id),
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
      FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_roles (
      user_id TEXT NOT NULL,
      role_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (user_id, role_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
    CREATE INDEX IF NOT EXISTS idx_permissions_module ON permissions(module);
    CREATE INDEX IF NOT EXISTS idx_permissions_code ON permissions(code);
    CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
    CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);

    CREATE TABLE IF NOT EXISTS sensitive_verify_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      used_at TEXT,
      attempts INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_sensitive_tokens_user ON sensitive_verify_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_sensitive_tokens_token ON sensitive_verify_tokens(token);
    CREATE INDEX IF NOT EXISTS idx_sensitive_tokens_expires ON sensitive_verify_tokens(expires_at);
  `)

  syncDbClient.exec(`
    CREATE TABLE IF NOT EXISTS reconciliation_records (
      id TEXT PRIMARY KEY,
      recon_date TEXT NOT NULL,
      order_count INTEGER DEFAULT 0,
      payment_count INTEGER DEFAULT 0,
      order_total_amount REAL DEFAULT 0,
      payment_total_amount REAL DEFAULT 0,
      diff_amount REAL DEFAULT 0,
      diff_count INTEGER DEFAULT 0,
      details TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(recon_date)
    );

    CREATE INDEX IF NOT EXISTS idx_recon_date ON reconciliation_records(recon_date);

    CREATE TABLE IF NOT EXISTS login_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      attempts INTEGER DEFAULT 0,
      locked_until TEXT,
      last_attempt TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_login_attempts_username ON login_attempts(username);

    CREATE TABLE IF NOT EXISTS verify_codes (
      id TEXT PRIMARY KEY,
      phone TEXT,
      email TEXT,
      phone_hash TEXT,
      email_hash TEXT,
      code TEXT NOT NULL,
      type TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      attempts INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_verify_codes_phone ON verify_codes(phone);
    CREATE INDEX IF NOT EXISTS idx_verify_codes_email ON verify_codes(email);
    CREATE INDEX IF NOT EXISTS idx_verify_codes_expires ON verify_codes(expires_at);
    CREATE INDEX IF NOT EXISTS idx_verify_codes_type ON verify_codes(type);
  `)

  try {
    syncDbClient.prepare('ALTER TABLE verify_codes ADD COLUMN phone_hash TEXT').run()
    logger.info('Migrated: added phone_hash column to verify_codes table')
  } catch {}
  try {
    syncDbClient.prepare('ALTER TABLE verify_codes ADD COLUMN email_hash TEXT').run()
    logger.info('Migrated: added email_hash column to verify_codes table')
  } catch {}
  try {
    syncDbClient
      .prepare('CREATE INDEX IF NOT EXISTS idx_verify_codes_phone_hash ON verify_codes(phone_hash)')
      .run()
  } catch {}
  try {
    syncDbClient
      .prepare('CREATE INDEX IF NOT EXISTS idx_verify_codes_email_hash ON verify_codes(email_hash)')
      .run()
  } catch {}

  migrateDatabase()
}

function migrateAuditLogsTable() {
  if (!syncDbClient) {
    return
  }

  const columns = getTableColumns('audit_logs')

  if (columns.length === 0) {
    syncDbClient.exec(`
      CREATE TABLE audit_logs (
        id TEXT PRIMARY KEY,
        admin_id TEXT,
        admin_name TEXT,
        action TEXT NOT NULL,
        resource_type TEXT NOT NULL,
        resource_id TEXT,
        before_data TEXT,
        after_data TEXT,
        ip TEXT,
        user_agent TEXT,
        status TEXT DEFAULT 'success',
        error_message TEXT,
        created_at TEXT NOT NULL
      );

      CREATE INDEX idx_audit_admin ON audit_logs(admin_id);
      CREATE INDEX idx_audit_action ON audit_logs(action);
      CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);
      CREATE INDEX idx_audit_created ON audit_logs(created_at);
    `)
    logger.info('Created: audit_logs table')
    return
  }

  const hasAdminName = columns.some((col: { name: string }) => col.name === 'admin_name')
  const hasResourceType = columns.some((col: { name: string }) => col.name === 'resource_type')
  const hasBeforeData = columns.some((col: { name: string }) => col.name === 'before_data')
  const hasIp = columns.some((col: { name: string }) => col.name === 'ip')
  const hasStatusField = columns.some((col: { name: string }) => col.name === 'status')

  const foreignKeys = getForeignKeyList('audit_logs')
  const hasForeignKey = foreignKeys.length > 0

  if (
    !hasAdminName ||
    !hasResourceType ||
    !hasBeforeData ||
    !hasIp ||
    !hasStatusField ||
    hasForeignKey
  ) {
    try {
      syncDbClient.exec('ALTER TABLE audit_logs RENAME TO audit_logs_old')

      syncDbClient.exec(`
        CREATE TABLE audit_logs (
          id TEXT PRIMARY KEY,
          admin_id TEXT,
          admin_name TEXT,
          action TEXT NOT NULL,
          resource_type TEXT NOT NULL,
          resource_id TEXT,
          before_data TEXT,
          after_data TEXT,
          ip TEXT,
          user_agent TEXT,
          status TEXT DEFAULT 'success',
          error_message TEXT,
          created_at TEXT NOT NULL
        );
      `)

      const oldData = syncDbClient.prepare('SELECT * FROM audit_logs_old').all() as Array<
        Record<string, unknown>
      >
      const insertStmt = syncDbClient.prepare(`
        INSERT INTO audit_logs (
          id, admin_id, admin_name, action, resource_type, resource_id,
          before_data, after_data, ip, user_agent, status, error_message, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      const transaction = syncDbClient.transaction(() => {
        for (const row of oldData) {
          insertStmt.run(
            row.id,
            row.admin_id || null,
            row.admin_username || row.admin_name || null,
            row.action,
            row.module || row.resource_type || 'unknown',
            row.target_id || row.resource_id || null,
            row.old_value || row.before_data || null,
            row.new_value || row.after_data || null,
            row.ip_address || row.ip || null,
            row.user_agent || null,
            row.result || row.status || 'success',
            row.error_message || null,
            row.created_at
          )
        }
      })
      transaction()

      syncDbClient.exec('DROP TABLE audit_logs_old')

      syncDbClient.exec('CREATE INDEX IF NOT EXISTS idx_audit_admin ON audit_logs(admin_id)')
      syncDbClient.exec('CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action)')
      syncDbClient.exec(
        'CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource_type, resource_id)'
      )
      syncDbClient.exec('CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at)')

      logger.info('Migrated: audit_logs table structure updated')
    } catch (err) {
      logger.error('Failed to migrate audit_logs table:', (err as Error).message)
    }
  }
}

function migrateDatabase() {
  if (!syncDbClient) {
    return
  }

  const columns = getTableColumns('users')
  const hasBalance = columns.some((col: { name: string }) => col.name === 'balance')
  if (!hasBalance) {
    syncDbClient.exec('ALTER TABLE users ADD COLUMN balance REAL DEFAULT 0')
    logger.info('Migrated: added balance column to users table')
  }

  const hasEmailVerified = columns.some((col: { name: string }) => col.name === 'email_verified')
  if (!hasEmailVerified) {
    syncDbClient.exec('ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0')
    logger.info('Migrated: added email_verified column to users table')
  }

  const hasPhoneVerified = columns.some((col: { name: string }) => col.name === 'phone_verified')
  if (!hasPhoneVerified) {
    syncDbClient.exec('ALTER TABLE users ADD COLUMN phone_verified INTEGER DEFAULT 0')
    logger.info('Migrated: added phone_verified column to users table')
  }

  const hasIsNewUser = columns.some((col: { name: string }) => col.name === 'is_new_user')
  if (!hasIsNewUser) {
    syncDbClient.exec('ALTER TABLE users ADD COLUMN is_new_user INTEGER DEFAULT 1')
    logger.info('Migrated: added is_new_user column to users table')
  }

  const payColumns = getTableColumns('payments')
  const hasRefundedAt = payColumns.some((col: { name: string }) => col.name === 'refunded_at')
  if (!hasRefundedAt) {
    syncDbClient.exec('ALTER TABLE payments ADD COLUMN refunded_at TEXT')
    logger.info('Migrated: added refunded_at column to payments table')
  }

  const hasFailureReason = payColumns.some((col: { name: string }) => col.name === 'failure_reason')
  if (!hasFailureReason) {
    syncDbClient.exec('ALTER TABLE payments ADD COLUMN failure_reason TEXT')
    logger.info('Migrated: added failure_reason column to payments table')
  }

  const hasClosedAt = payColumns.some((col: { name: string }) => col.name === 'closed_at')
  if (!hasClosedAt) {
    syncDbClient.exec('ALTER TABLE payments ADD COLUMN closed_at TEXT')
    logger.info('Migrated: added closed_at column to payments table')
  }

  const orderColumns = getTableColumns('orders')
  const hasRefundReason = orderColumns.some((col: { name: string }) => col.name === 'refund_reason')
  if (!hasRefundReason) {
    syncDbClient.exec('ALTER TABLE orders ADD COLUMN refund_reason TEXT')
    logger.info('Migrated: added refund_reason column to orders table')
  }

  const hasRefundAmount = orderColumns.some((col: { name: string }) => col.name === 'refund_amount')
  if (!hasRefundAmount) {
    syncDbClient.exec('ALTER TABLE orders ADD COLUMN refund_amount REAL DEFAULT 0')
    logger.info('Migrated: added refund_amount column to orders table')
  }

  const hasRefundRemark = orderColumns.some((col: { name: string }) => col.name === 'refund_remark')
  if (!hasRefundRemark) {
    syncDbClient.exec('ALTER TABLE orders ADD COLUMN refund_remark TEXT')
    logger.info('Migrated: added refund_remark column to orders table')
  }

  const hasOrderRefundedAt = orderColumns.some(
    (col: { name: string }) => col.name === 'refunded_at'
  )
  if (!hasOrderRefundedAt) {
    syncDbClient.exec('ALTER TABLE orders ADD COLUMN refunded_at TEXT')
    logger.info('Migrated: added refunded_at column to orders table')
  }

  const hasCouponId = orderColumns.some((col: { name: string }) => col.name === 'coupon_id')
  if (!hasCouponId) {
    syncDbClient.exec('ALTER TABLE orders ADD COLUMN coupon_id TEXT')
    logger.info('Migrated: added coupon_id column to orders table')
  }

  const flashSaleColumns = getTableColumns('flash_sales')
  const hasDescription = flashSaleColumns.some(
    (col: { name: string }) => col.name === 'description'
  )
  if (!hasDescription) {
    syncDbClient.exec('ALTER TABLE flash_sales ADD COLUMN description TEXT')
    logger.info('Migrated: added description column to flash_sales table')
  }

  const flashSaleItemColumns = getTableColumns('flash_sale_items')
  const hasLimitPerUser = flashSaleItemColumns.some(
    (col: { name: string }) => col.name === 'limit_per_user'
  )
  if (!hasLimitPerUser) {
    syncDbClient.exec('ALTER TABLE flash_sale_items ADD COLUMN limit_per_user INTEGER DEFAULT 1')
    logger.info('Migrated: added limit_per_user column to flash_sale_items table')
  }

  const flashSaleOrdersTable = getTableColumns('flash_sale_orders')
  if (flashSaleOrdersTable.length === 0) {
    syncDbClient.exec(`
      CREATE TABLE IF NOT EXISTS flash_sale_orders (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        flash_sale_id TEXT NOT NULL,
        flash_sale_item_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        sku_id TEXT,
        quantity INTEGER DEFAULT 1,
        price REAL NOT NULL DEFAULT 0,
        original_price REAL DEFAULT 0,
        status TEXT DEFAULT 'pending',
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (flash_sale_id) REFERENCES flash_sales(id) ON DELETE CASCADE,
        FOREIGN KEY (flash_sale_item_id) REFERENCES flash_sale_items(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (sku_id) REFERENCES product_skus(id) ON DELETE SET NULL
      );
    `)
    syncDbClient.exec(
      'CREATE INDEX IF NOT EXISTS idx_flash_sale_orders_user ON flash_sale_orders(user_id)'
    )
    syncDbClient.exec(
      'CREATE INDEX IF NOT EXISTS idx_flash_sale_orders_sale ON flash_sale_orders(flash_sale_id)'
    )
    syncDbClient.exec(
      'CREATE INDEX IF NOT EXISTS idx_flash_sale_orders_item ON flash_sale_orders(flash_sale_item_id)'
    )
    syncDbClient.exec(
      'CREATE INDEX IF NOT EXISTS idx_flash_sale_orders_status ON flash_sale_orders(status)'
    )
    syncDbClient.exec(
      'CREATE INDEX IF NOT EXISTS idx_flash_sale_orders_created ON flash_sale_orders(created_at)'
    )
    logger.info('Migrated: created flash_sale_orders table')
  }

  const shippingColumns = getTableColumns('shipping_templates')
  const hasEstimatedDays = shippingColumns.some(
    (col: { name: string }) => col.name === 'estimated_days'
  )
  if (!hasEstimatedDays) {
    syncDbClient.exec('ALTER TABLE shipping_templates ADD COLUMN estimated_days TEXT')
    logger.info('Migrated: added estimated_days column to shipping_templates table')
  }

  const hasStatus = shippingColumns.some((col: { name: string }) => col.name === 'status')
  if (!hasStatus) {
    syncDbClient.exec("ALTER TABLE shipping_templates ADD COLUMN status TEXT DEFAULT 'active'")
    logger.info('Migrated: added status column to shipping_templates table')
  }

  const couponColumns = getTableColumns('coupons')
  const hasMaxDiscount = couponColumns.some((col: { name: string }) => col.name === 'max_discount')
  if (!hasMaxDiscount) {
    syncDbClient.exec('ALTER TABLE coupons ADD COLUMN max_discount REAL')
    logger.info('Migrated: added max_discount column to coupons table')
  }

  const hasTotalQuantity = couponColumns.some(
    (col: { name: string }) => col.name === 'total_quantity'
  )
  const hasTotalCount = couponColumns.some((col: { name: string }) => col.name === 'total_count')
  if (!hasTotalQuantity && hasTotalCount) {
    syncDbClient.exec('ALTER TABLE coupons RENAME COLUMN total_count TO total_quantity')
    logger.info('Migrated: renamed total_count to total_quantity in coupons table')
  }

  const hasUsedCount = couponColumns.some((col: { name: string }) => col.name === 'used_count')
  const hasUsedQuantity = couponColumns.some(
    (col: { name: string }) => col.name === 'used_quantity'
  )
  if (hasUsedCount && !hasUsedQuantity) {
    syncDbClient.exec('ALTER TABLE coupons RENAME COLUMN used_count TO used_quantity')
    logger.info('Migrated: renamed used_count to used_quantity in coupons table')
  }

  const userCouponColumns = getTableColumns('user_coupons')
  const hasOrderId = userCouponColumns.some((col: { name: string }) => col.name === 'order_id')
  if (!hasOrderId) {
    syncDbClient.exec('ALTER TABLE user_coupons ADD COLUMN order_id TEXT')
    logger.info('Migrated: added order_id column to user_coupons table')
  }
}

function initRbacData() {
  if (!syncDbClient) {
    return
  }

  const now = new Date().toISOString()

  const insertRole = syncDbClient.prepare(
    translateSql(
      'INSERT OR IGNORE INTO roles (id, name, description, is_system, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)'
    )
  )

  const roles = [
    { name: 'super_admin', description: '超级管理员，拥有所有权限' },
    { name: 'product_admin', description: '商品管理员，负责商品管理' },
    { name: 'order_admin', description: '订单管理员，负责订单管理' },
    { name: 'finance_admin', description: '财务管理员，负责支付和退款' },
  ]

  const roleIds: Record<string, string> = {}
  for (const role of roles) {
    const existing = syncDbClient
      .prepare(translateSql('SELECT id FROM roles WHERE name = ?'))
      .get(role.name) as { id: string } | undefined
    if (existing) {
      roleIds[role.name] = existing.id
    } else {
      const id = generateId('ROL')
      roleIds[role.name] = id
      insertRole.run(id, role.name, role.description, now, now)
    }
  }

  const superAdminId = roleIds.super_admin
  const productAdminId = roleIds.product_admin
  const orderAdminId = roleIds.order_admin
  const financeAdminId = roleIds.finance_admin

  const permissions = [
    { code: 'product:view', name: '查看商品', module: 'product' },
    { code: 'product:create', name: '创建商品', module: 'product' },
    { code: 'product:update', name: '编辑商品', module: 'product' },
    { code: 'product:delete', name: '删除商品', module: 'product' },
    { code: 'order:view', name: '查看订单', module: 'order' },
    { code: 'order:update', name: '更新订单状态', module: 'order' },
    { code: 'order:ship', name: '订单发货', module: 'order' },
    { code: 'order:refund', name: '退款审核', module: 'order' },
    { code: 'user:view', name: '查看用户', module: 'user' },
    { code: 'user:update', name: '编辑用户', module: 'user' },
    { code: 'coupon:view', name: '查看优惠券', module: 'coupon' },
    { code: 'coupon:create', name: '创建优惠券', module: 'coupon' },
    { code: 'coupon:issue', name: '发放优惠券', module: 'coupon' },
    { code: 'member:view', name: '查看会员', module: 'member' },
    { code: 'member:update', name: '编辑会员', module: 'member' },
    { code: 'finance:view', name: '查看财务', module: 'finance' },
    { code: 'finance:refund', name: '财务退款', module: 'finance' },
    { code: 'review:view', name: '查看评论', module: 'review' },
    { code: 'review:manage', name: '管理评论', module: 'review' },
    { code: 'dashboard:view', name: '查看仪表盘', module: 'dashboard' },
    { code: 'audit:view', name: '查看审计日志', module: 'audit' },
    { code: 'system:backup', name: '系统备份', module: 'system' },
    { code: 'system:role', name: '角色管理', module: 'system' },
  ]

  const insertPermission = syncDbClient.prepare(
    translateSql(
      'INSERT OR IGNORE INTO permissions (id, name, code, module, description, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    )
  )

  const permIds: Record<string, string> = {}
  for (const perm of permissions) {
    const existingPerm = syncDbClient
      .prepare(translateSql('SELECT id FROM permissions WHERE code = ?'))
      .get(perm.code) as { id: string } | undefined
    if (existingPerm) {
      permIds[perm.code] = existingPerm.id
    } else {
      const id = generateId('PER')
      permIds[perm.code] = id
      insertPermission.run(id, perm.name, perm.code, perm.module, '', now)
    }
  }

  const insertRolePerm = syncDbClient.prepare(
    translateSql(
      'INSERT OR IGNORE INTO role_permissions (role_id, permission_id, created_at) VALUES (?, ?, ?)'
    )
  )

  for (const code of Object.keys(permIds)) {
    insertRolePerm.run(superAdminId, permIds[code], now)
  }

  const productPerms = [
    'product:view',
    'product:create',
    'product:update',
    'product:delete',
    'dashboard:view',
  ]
  for (const code of productPerms) {
    insertRolePerm.run(productAdminId, permIds[code], now)
  }

  const orderPerms = ['order:view', 'order:update', 'order:ship', 'dashboard:view']
  for (const code of orderPerms) {
    insertRolePerm.run(orderAdminId, permIds[code], now)
  }

  const financePerms = [
    'finance:view',
    'finance:refund',
    'order:refund',
    'order:view',
    'dashboard:view',
  ]
  for (const code of financePerms) {
    insertRolePerm.run(financeAdminId, permIds[code], now)
  }

  const adminUser = syncDbClient
    .prepare(translateSql('SELECT * FROM users WHERE username = ?'))
    .get('admin') as { id: string } | undefined
  if (adminUser) {
    syncDbClient
      .prepare(
        translateSql(
          'INSERT OR IGNORE INTO user_roles (user_id, role_id, created_at) VALUES (?, ?, ?)'
        )
      )
      .run(adminUser.id, superAdminId, now)
  }

  logger.info('Default RBAC data initialized')
}

function initDefaultData() {
  if (!syncDbClient) {
    return
  }

  const adminUser = syncDbClient
    .prepare(translateSql('SELECT * FROM users WHERE username = ?'))
    .get('admin') as Record<string, unknown> | undefined
  if (!adminUser) {
    const now = new Date().toISOString()
    const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'admin123456'
    const hashedPassword = bcrypt.hashSync(adminPassword, 10)

    syncDbClient
      .prepare(
        translateSql(`
      INSERT INTO users (id, username, email, password, nickname, role, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
      )
      .run(
        generateId(),
        'admin',
        'admin@gexm.com',
        hashedPassword,
        '超级管理员',
        'admin',
        'active',
        now,
        now
      )

    logger.info('Default admin user created: admin')
  }

  initMallData()
  initRbacData()
}

function initMallData() {
  if (!syncDbClient) {
    return
  }

  const now = new Date().toISOString()

  // 初始化默认会员等级（避免 user_points 外键约束失败）
  const existingLevels = syncDbClient
    .prepare(translateSql('SELECT COUNT(*) as count FROM member_levels'))
    .get() as { count: number }
  if (existingLevels.count === 0) {
    const insertLevel = syncDbClient.prepare(
      translateSql(
        'INSERT OR IGNORE INTO member_levels (id, name, min_points, discount_rate, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      )
    )
    const defaultLevels = [
      { id: 'LVL1', name: '普通会员', min_points: 0, discount_rate: 1, sort_order: 1 },
      { id: 'LVL2', name: '白银会员', min_points: 1000, discount_rate: 0.98, sort_order: 2 },
      { id: 'LVL3', name: '黄金会员', min_points: 5000, discount_rate: 0.95, sort_order: 3 },
      { id: 'LVL4', name: '钻石会员', min_points: 20000, discount_rate: 0.9, sort_order: 4 },
    ]
    for (const level of defaultLevels) {
      insertLevel.run(
        level.id,
        level.name,
        level.min_points,
        level.discount_rate,
        level.sort_order,
        now
      )
    }
  }

  const categoryRows = syncDbClient
    .prepare(translateSql('SELECT id, name FROM categories ORDER BY sort_order'))
    .all()
  let categories: Array<{
    id: string
    name: string
    parent_id: string | null
    level: number
    icon: string
    sort_order: number
  }> = []

  if (categoryRows.length === 0) {
    categories = [
      { id: generateId(), name: '数码电子', parent_id: null, level: 1, icon: '📱', sort_order: 1 },
      { id: generateId(), name: '服饰鞋包', parent_id: null, level: 1, icon: '👕', sort_order: 2 },
      { id: generateId(), name: '美妆护肤', parent_id: null, level: 1, icon: '💄', sort_order: 3 },
      { id: generateId(), name: '食品生鲜', parent_id: null, level: 1, icon: '🍎', sort_order: 4 },
      { id: generateId(), name: '家居生活', parent_id: null, level: 1, icon: '🏠', sort_order: 5 },
      { id: generateId(), name: '运动户外', parent_id: null, level: 1, icon: '⚽', sort_order: 6 },
      { id: generateId(), name: '图书文具', parent_id: null, level: 1, icon: '📚', sort_order: 7 },
      { id: generateId(), name: '母婴玩具', parent_id: null, level: 1, icon: '🧸', sort_order: 8 },
    ]

    const insertCategory = syncDbClient.prepare(
      translateSql(
        'INSERT INTO categories (id, name, parent_id, level, icon, sort_order, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      )
    )

    categories.forEach((cat) => {
      insertCategory.run(
        cat.id,
        cat.name,
        cat.parent_id,
        cat.level,
        cat.icon,
        cat.sort_order,
        'active',
        now,
        now
      )
    })
  } else {
    categories = categoryRows as Array<{
      id: string
      name: string
      parent_id: string | null
      level: number
      icon: string
      sort_order: number
    }>
  }

  const productCount = (
    syncDbClient.prepare(translateSql('SELECT COUNT(*) as count FROM products')).get() as {
      count: number
    }
  ).count
  if (productCount > 0) {
    return
  }

  const products = [
    {
      name: '智能手机 Pro Max',
      subtitle: '全新旗舰，性能怪兽',
      category_id: categories[0].id,
      main_image:
        'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=modern%20smartphone%20pro%20max%20flagship%20device%20black%20sleek%20design%20product%20photography&image_size=square',
      images: JSON.stringify([
        'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=modern%20smartphone%20pro%20max%20flagship%20device%20black%20sleek%20design%20product%20photography&image_size=landscape_4_3',
        'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=smartphone%20camera%20module%20closeup%20technology%20photography&image_size=landscape_4_3',
      ]),
      price: 5999,
      original_price: 6999,
      stock: 100,
      description: '搭载最新处理器，超清屏幕，超长续航，专业级影像系统。',
    },
    {
      name: '无线蓝牙耳机',
      subtitle: '主动降噪，沉浸体验',
      category_id: categories[0].id,
      main_image:
        'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=wireless%20bluetooth%20earbuds%20white%20sleek%20modern%20design%20product%20photography&image_size=square',
      images: JSON.stringify([
        'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=wireless%20bluetooth%20earbuds%20white%20sleek%20modern%20design%20product%20photography&image_size=landscape_4_3',
      ]),
      price: 299,
      original_price: 399,
      stock: 500,
      description: '主动降噪技术，Hi-Fi音质，30小时续航，IPX5防水。',
    },
    {
      name: '运动休闲T恤',
      subtitle: '透气舒适，时尚百搭',
      category_id: categories[1].id,
      main_image:
        'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=sporty%20casual%20t-shirt%20white%20cotton%20comfortable%20fashion%20product%20photography&image_size=square',
      images: JSON.stringify([
        'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=sporty%20casual%20t-shirt%20white%20cotton%20comfortable%20fashion%20product%20photography&image_size=landscape_4_3',
      ]),
      price: 99,
      original_price: 149,
      stock: 200,
      description: '纯棉面料，透气吸汗，简约设计，多色可选。',
    },
    {
      name: '保湿精华液',
      subtitle: '深层补水，焕亮肌肤',
      category_id: categories[2].id,
      main_image:
        'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=skincare%20serum%20bottle%20elegant%20glass%20cosmetic%20product%20photography%20minimalist&image_size=square',
      images: JSON.stringify([
        'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=skincare%20serum%20bottle%20elegant%20glass%20cosmetic%20product%20photography%20minimalist&image_size=landscape_4_3',
      ]),
      price: 198,
      original_price: 298,
      stock: 300,
      description: '玻尿酸精华，深层补水，改善肤质，适合各种肌肤。',
    },
    {
      name: '有机坚果礼盒',
      subtitle: '精选坚果，健康美味',
      category_id: categories[3].id,
      main_image:
        'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=organic%20mixed%20nuts%20gift%20box%20healthy%20snacks%20food%20photography&image_size=square',
      images: JSON.stringify([
        'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=organic%20mixed%20nuts%20gift%20box%20healthy%20snacks%20food%20photography&image_size=landscape_4_3',
      ]),
      price: 128,
      original_price: 168,
      stock: 150,
      description: '8种精选坚果，每日坚果，营养健康。',
    },
    {
      name: '北欧风台灯',
      subtitle: '护眼LED，三档调光',
      category_id: categories[4].id,
      main_image:
        'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=nordic%20style%20desk%20lamp%20LED%20modern%20minimalist%20lighting%20product%20photography&image_size=square',
      images: JSON.stringify([
        'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=nordic%20style%20desk%20lamp%20LED%20modern%20minimalist%20lighting%20product%20photography&image_size=landscape_4_3',
      ]),
      price: 159,
      original_price: 199,
      stock: 80,
      description: '北欧简约设计，LED护眼灯珠，三档亮度调节。',
    },
    {
      name: '专业跑步鞋',
      subtitle: '轻量缓震，透气网面',
      category_id: categories[5].id,
      main_image:
        'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20running%20shoes%20sneakers%20white%20sporty%20design%20product%20photography&image_size=square',
      images: JSON.stringify([
        'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20running%20shoes%20sneakers%20white%20sporty%20design%20product%20photography&image_size=landscape_4_3',
      ]),
      price: 399,
      original_price: 599,
      stock: 120,
      description: '专业缓震科技，透气网面，轻量化设计。',
    },
    {
      name: '畅销小说套装',
      subtitle: '经典文学，值得收藏',
      category_id: categories[6].id,
      main_image:
        'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=classic%20novels%20book%20set%20hardcover%20literature%20collection%20product%20photography&image_size=square',
      images: JSON.stringify([
        'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=classic%20novels%20book%20set%20hardcover%20literature%20collection%20product%20photography&image_size=landscape_4_3',
      ]),
      price: 89,
      original_price: 128,
      stock: 200,
      description: '精选畅销小说，精装版，值得珍藏。',
    },
  ]

  const insertProduct = syncDbClient.prepare(
    translateSql(`INSERT INTO products (id, name, subtitle, category_id, main_image, images, price, original_price, stock, sales, description, status, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'on_sale', 0, ?, ?)`)
  )

  const insertSku = syncDbClient.prepare(
    translateSql(`INSERT INTO product_skus (id, product_id, sku_name, specs, price, original_price, stock, sku_image, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
  )

  products.forEach((p) => {
    const productId = generateId()
    insertProduct.run(
      productId,
      p.name,
      p.subtitle,
      p.category_id,
      p.main_image,
      p.images,
      p.price,
      p.original_price,
      p.stock,
      p.description,
      now,
      now
    )

    const skus = [
      {
        name: '标准版',
        specs: JSON.stringify({ 版本: '标准版' }),
        price: p.price,
        stock: Math.floor(p.stock * 0.6),
      },
      {
        name: '豪华版',
        specs: JSON.stringify({ 版本: '豪华版' }),
        price: p.price * 1.2,
        stock: Math.floor(p.stock * 0.4),
      },
    ]

    skus.forEach((sku) => {
      insertSku.run(
        generateId(),
        productId,
        sku.name,
        sku.specs,
        sku.price,
        p.original_price,
        sku.stock,
        p.main_image,
        now,
        now
      )
    })
  })

  logger.info('Default mall data created')
}

function getDb(): ISyncDbClient {
  if (!syncDbClient) {
    initDatabase()
  }
  return syncDbClient!
}

function closeDb(): void {
  if (syncDbClient) {
    syncDbClient.close()
    syncDbClient = null
  }
}

export { initDatabase, getDb, closeDb, initRbacData }
