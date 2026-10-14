import { getDb } from './index'
import { generateId } from '../utils/response'

interface OAuthState {
  id: string
  state: string
  redirectUri?: string
  expiresAt: number
  createdAt: string
}

const oauthStateModel: {
  create: (state: string, redirectUri?: string, expiresAt?: number) => OAuthState
  findByState: (state: string) => OAuthState | undefined
  deleteByState: (state: string) => boolean
  cleanupExpired: () => void
} = {
  create(state, redirectUri, expiresAt = Date.now() + 600000) {
    const db = getDb()
    const now = new Date().toISOString()
    const id = generateId()

    db.prepare(
      'INSERT INTO oauth_states (id, state, redirect_uri, expires_at, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run(id, state, redirectUri || '', expiresAt, now)

    return this.findByState(state) as OAuthState
  },

  findByState(state) {
    const db = getDb()
    const result = db
      .prepare(
        'SELECT id, state, redirect_uri as redirectUri, expires_at as expiresAt, created_at as createdAt FROM oauth_states WHERE state = ?'
      )
      .get(state)
    return result as OAuthState | undefined
  },

  deleteByState(state) {
    const db = getDb()
    const result = db.prepare('DELETE FROM oauth_states WHERE state = ?').run(state)
    return result.changes > 0
  },

  cleanupExpired() {
    const db = getDb()
    const now = Date.now()
    const result = db.prepare('DELETE FROM oauth_states WHERE expires_at < ?').run(now)
    return result.changes > 0
  },
}

export default oauthStateModel
