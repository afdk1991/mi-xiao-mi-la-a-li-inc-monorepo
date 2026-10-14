process.env.DB_TYPE = 'sqlite'
process.env.DB_PATH = ':memory:'

import { isPostgres, translateSql } from '../../models/sqlDialect'

describe('sqlDialect', () => {
  describe('isPostgres()', () => {
    it('should return false when DB_TYPE=sqlite', () => {
      expect(isPostgres()).toBe(false)
    })

    it('should return true when DB_TYPE=postgres', () => {
      const original = process.env.DB_TYPE
      process.env.DB_TYPE = 'postgres'
      expect(isPostgres()).toBe(true)
      process.env.DB_TYPE = original
    })
  })

  describe('translateSql() — SQLite mode (passthrough)', () => {
    beforeEach(() => {
      process.env.DB_TYPE = 'sqlite'
    })

    it('should pass through SQLite SQL unchanged', () => {
      const sql = 'CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY AUTOINCREMENT)'
      expect(translateSql(sql)).toBe(sql)
    })

    it('should pass through INSERT OR IGNORE unchanged', () => {
      const sql = 'INSERT OR IGNORE INTO users (id) VALUES (?)'
      expect(translateSql(sql)).toBe(sql)
    })
  })

  describe('translateSql() — PostgreSQL mode', () => {
    beforeEach(() => {
      process.env.DB_TYPE = 'postgres'
    })

    afterEach(() => {
      process.env.DB_TYPE = 'sqlite'
    })

    it('should convert AUTOINCREMENT to SERIAL', () => {
      const sql = 'CREATE TABLE test (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)'
      const translated = translateSql(sql)
      expect(translated).toContain('SERIAL')
      expect(translated).not.toContain('AUTOINCREMENT')
      expect(translated).toContain('PRIMARY KEY')
    })

    it('should convert INSERT OR IGNORE to ON CONFLICT DO NOTHING', () => {
      const sql = 'INSERT OR IGNORE INTO roles (id, name) VALUES (?, ?)'
      const translated = translateSql(sql)
      expect(translated).toContain('ON CONFLICT DO NOTHING')
      expect(translated).not.toContain('OR IGNORE')
    })

    it('should convert ? placeholders to $N format', () => {
      const sql = 'INSERT INTO users (id, name) VALUES (?, ?)'
      const translated = translateSql(sql)
      expect(translated).toContain('$1')
      expect(translated).toContain('$2')
      expect(translated).not.toContain('?')
    })

    it('should convert multiple ? in WHERE clause', () => {
      const sql = 'SELECT * FROM users WHERE id = ? AND name = ?'
      const translated = translateSql(sql)
      expect(translated).toContain('WHERE id = $1 AND name = $2')
    })

    it('should not convert ? inside string literals', () => {
      const sql = "SELECT * FROM users WHERE name = 'what?'"
      const translated = translateSql(sql)
      expect(translated).toContain("'what?'")
      expect(translated).not.toContain("$1")
    })

    it('should pass through ALTER TABLE RENAME COLUMN', () => {
      const sql = 'ALTER TABLE coupons RENAME COLUMN total_count TO total_quantity'
      expect(translateSql(sql)).toBe(sql)
    })
  })
})