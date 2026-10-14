import { getDb } from './index'
import { generateId } from '../utils/response'

interface SearchHistoryRecord {
  id: string
  user_id: string | null
  keyword: string
  search_count: number
  last_searched_at: string
  created_at: string
}

interface GetUserSearchHistoryOptions {
  page?: number
  pageSize?: number
}

interface HotKeyword {
  keyword: string
  search_count: number
}

interface Suggestion {
  name: string
}

const searchModel = {
  recordSearch(keyword: string, userId: string | null = null): string | undefined {
    const db = getDb()
    const now = new Date().toISOString()

    if (!keyword || !keyword.trim()) {
      return
    }

    const trimmedKeyword = keyword.trim()

    let existingRecord: SearchHistoryRecord | undefined
    if (userId) {
      existingRecord = db
        .prepare('SELECT * FROM search_history WHERE user_id = ? AND keyword = ?')
        .get(userId, trimmedKeyword) as SearchHistoryRecord | undefined
    } else {
      existingRecord = db
        .prepare('SELECT * FROM search_history WHERE user_id IS NULL AND keyword = ?')
        .get(trimmedKeyword) as SearchHistoryRecord | undefined
    }

    if (existingRecord) {
      db.prepare(
        'UPDATE search_history SET search_count = search_count + 1, last_searched_at = ? WHERE id = ?'
      ).run(now, existingRecord.id)
      return existingRecord.id
    } else {
      const id = generateId()
      db.prepare(
        `
        INSERT INTO search_history (id, user_id, keyword, search_count, last_searched_at, created_at)
        VALUES (?, ?, ?, 1, ?, ?)
      `
      ).run(id, userId, trimmedKeyword, now, now)
      return id
    }
  },

  getHotKeywords(limit: number = 10): string[] {
    const db = getDb()
    const keywords = db
      .prepare(
        `
      SELECT keyword, SUM(search_count) as search_count
      FROM search_history
      GROUP BY keyword
      ORDER BY search_count DESC, last_searched_at DESC
      LIMIT ?
    `
      )
      .all(limit) as HotKeyword[]

    return keywords.map((k) => k.keyword)
  },

  getUserSearchHistory(
    userId: string,
    options: GetUserSearchHistoryOptions = {}
  ): { history: SearchHistoryRecord[]; total: number } {
    const db = getDb()
    const { page = 1, pageSize = 20 } = options
    const offset = (page - 1) * pageSize

    const countResult = db
      .prepare('SELECT COUNT(*) as count FROM search_history WHERE user_id = ?')
      .get(userId) as { count: number }

    const history = db
      .prepare(
        `
      SELECT keyword, search_count, last_searched_at
      FROM search_history
      WHERE user_id = ?
      ORDER BY last_searched_at DESC
      LIMIT ? OFFSET ?
    `
      )
      .all(userId, pageSize, offset) as SearchHistoryRecord[]

    return { history, total: countResult.count }
  },

  clearUserSearchHistory(userId: string): number {
    const db = getDb()
    const result = db.prepare('DELETE FROM search_history WHERE user_id = ?').run(userId)
    return result.changes
  },

  deleteUserSearchHistoryItem(userId: string, keyword: string): boolean {
    const db = getDb()
    const result = db
      .prepare('DELETE FROM search_history WHERE user_id = ? AND keyword = ?')
      .run(userId, keyword)
    return result.changes > 0
  },

  getSuggestions(keyword: string, limit: number = 5): string[] {
    const db = getDb()
    if (!keyword || !keyword.trim()) {
      return []
    }

    const searchPattern = `${keyword.trim()}%`
    const suggestions = db
      .prepare(
        `
      SELECT name
      FROM products
      WHERE status = 'on_sale' AND name LIKE ?
      LIMIT ?
    `
      )
      .all(searchPattern, limit) as Suggestion[]

    return suggestions.map((p) => p.name)
  },
}

export default searchModel
