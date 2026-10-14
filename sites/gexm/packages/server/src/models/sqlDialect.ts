import config from '../config'
import { getDb } from './index'

export function isPostgres(): boolean {
  return process.env.DB_TYPE === 'postgres'
}

export function translateSql(sql: string): string {
  if (!isPostgres()) {
    return sql
  }

  let result = sql

  result = convertPlaceholders(result)

  result = result.replace(
    /INTEGER\s+PRIMARY\s+KEY\s+AUTOINCREMENT/gi,
    'SERIAL PRIMARY KEY'
  )

  const insertOrIgnoreMatch = result.match(
    /^(INSERT\s+OR\s+IGNORE\s+INTO\s+(\w+)\s*\(([^)]*)\)\s*VALUES\s*\(([^)]*)\))/i
  )
  if (insertOrIgnoreMatch) {
    const fullMatch = insertOrIgnoreMatch[1]
    const replacement = fullMatch.replace(
      /INSERT\s+OR\s+IGNORE\s+INTO/i,
      'INSERT INTO'
    ) + ` ON CONFLICT DO NOTHING`
    result = result.replace(fullMatch, replacement)
  }

  return result
}

function convertPlaceholders(sql: string): string {
  let result = ''
  let inString = false
  let paramIndex = 0

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i]

    if (char === "'") {
      if (inString && sql[i + 1] === "'") {
        result += "''"
        i++
        continue
      }
      inString = !inString
      result += char
    } else if (char === '?' && !inString) {
      paramIndex++
      result += `$${paramIndex}`
    } else {
      result += char
    }
  }

  return result
}

export function getTableColumns(tableName: string): Array<{ name: string; type: string }> {
  const db = getDb()

  if (isPostgres()) {
    const rows = db.prepare(
      `SELECT column_name as name, data_type as type
       FROM information_schema.columns
       WHERE table_name = $1 AND table_schema = 'public'
       ORDER BY ordinal_position`
    ).all(tableName)
    return rows as Array<{ name: string; type: string }>
  }

  const rows = db.pragma(`table_info(${tableName})`) as Array<{
    name: string
    type: string
  }>
  return rows.map((r) => ({ name: r.name, type: r.type }))
}

export function tableExists(tableName: string): boolean {
  const db = getDb()

  if (isPostgres()) {
    const result = db.prepare(
      `SELECT table_name FROM information_schema.tables
       WHERE table_name = $1 AND table_schema = 'public'`
    ).get(tableName)
    return !!result
  }

  const result = db.prepare(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`
  ).get(tableName)
  return !!result
}

export function getForeignKeyList(tableName: string): unknown[] {
  const db = getDb()

  if (isPostgres()) {
    const rows = db.prepare(
      `SELECT tc.constraint_name, kcu.column_name, ccu.table_name AS foreign_table_name,
              ccu.column_name AS foreign_column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
       JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
       WHERE tc.table_name = $1 AND tc.constraint_type = 'FOREIGN KEY'`
    ).all(tableName)
    return rows
  }

  return db.pragma(`foreign_key_list(${tableName})`)
}