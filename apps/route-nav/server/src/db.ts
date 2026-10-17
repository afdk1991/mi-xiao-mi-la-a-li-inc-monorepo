// 数据库层：node:sqlite（Node >= 22.5 内置，无需外部依赖）。
// 库文件落在 server/data/route-nav.db（已 gitignore），首次启动自动建表 + 灌入景点种子数据。

import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ATTRACTIONS_SEED } from './attractions.ts'

const HERE = dirname(fileURLToPath(import.meta.url))
const DB_PATH = process.env.ROUTE_NAV_DB ?? join(HERE, '..', 'data', 'route-nav.db')

mkdirSync(dirname(DB_PATH), { recursive: true })

export const db = new DatabaseSync(DB_PATH)

db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS addresses (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  address     TEXT NOT NULL,
  latitude    REAL NOT NULL,
  longitude   REAL NOT NULL,
  city        TEXT,
  is_start    INTEGER NOT NULL DEFAULT 0,
  is_end      INTEGER NOT NULL DEFAULT 0,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);
CREATE INDEX IF NOT EXISTS idx_addresses_user ON addresses(user_id);

CREATE TABLE IF NOT EXISTS routes (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  optimization_mode TEXT NOT NULL DEFAULT 'shortest',
  total_distance    REAL NOT NULL DEFAULT 0,
  address_ids       TEXT NOT NULL DEFAULT '[]',
  ordered_addresses TEXT NOT NULL DEFAULT '[]',
  created_at        TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);
CREATE INDEX IF NOT EXISTS idx_routes_user ON routes(user_id);

CREATE TABLE IF NOT EXISTS attractions (
  id        INTEGER PRIMARY KEY,
  name      TEXT NOT NULL,
  address   TEXT NOT NULL,
  latitude  REAL NOT NULL,
  longitude REAL NOT NULL,
  city      TEXT NOT NULL,
  category  TEXT NOT NULL,
  region    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_attractions_city ON attractions(city);

CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`)

// ---- 景点种子数据：仅当表为空时灌入 ----
const attractionCount = db.prepare('SELECT COUNT(*) AS n FROM attractions').get() as { n: number }
if (attractionCount.n === 0) {
  const insert = db.prepare(
    `INSERT INTO attractions (id, name, address, latitude, longitude, city, category, region)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  for (const a of ATTRACTIONS_SEED) {
    insert.run(a.id, a.name, a.address, a.latitude, a.longitude, a.city, a.category, a.region)
  }
}

/** 读取/写入 meta 键值对（如令牌签名密钥，保证重启后旧令牌仍有效） */
export function metaGet(key: string): string | null {
  const row = db.prepare('SELECT value FROM meta WHERE key = ?').get(key) as { value: string } | undefined
  return row?.value ?? null
}

export function metaSet(key: string, value: string): void {
  db.prepare('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value)
}
